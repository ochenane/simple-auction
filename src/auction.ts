import { Transaction, ethers } from 'ethers';
import hre from 'hardhat';
import prisma from './database';
import { ApiError } from './server';

/*
 * FIXME: This code currently has a potential issue:
 *        if the database update fails after the message is sent, the system might be out of sync.
 *        To ensure data consistency, we could implement a more robust approach like two-phase commit,
 *        outbox pattern, or event sourcing.
 *        However, for now, none of them is used for ease of development.
 */

export default class Auction {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  private constructor(provider: ethers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  static async new(url: string, privateKey: string): Promise<Auction> {
    const provider = new ethers.JsonRpcProvider(url);
    const signer = new ethers.Wallet(privateKey, provider);
    return new Auction(provider, signer);
  }

  public async deploy(biddingTime: number): Promise<number> {
    // FIXME: note above
    const simpleAuction = await hre.ethers.getContractFactory(
      'SimpleAuction',
      this.signer,
    );
    const address = await this.signer.getAddress();
    const deployment = await simpleAuction.deploy(biddingTime, address);
    const contract = await deployment.waitForDeployment();

    // This can also be calculated and verified
    const end = Number(await contract.auctionEndTime());

    const result = await prisma.auction.create({
      data: {
        address: await contract.getAddress(),
        endTime: new Date(end * 1000),
        ended: false,
        highestBid: 0n,
      },
    });

    return result.id;
  }

  /*
   * Status data can be read from either database or contract.
   * We are reading it from contract so it is more accurate
   * It can be faster (and simpler) if we read it from database instead
   *
   * We can also have a job to compare contract with database to detect
   * inconsistency and report if needed
   */
  public async status(id: number): Promise<AuctionStatus> {
    const { data, contract } = await this.contract(id);
    const end = Number(await contract.auctionEndTime());
    return {
      endTime: new Date(end * 1000),
      highestBid: ethers.formatEther(await contract.highestBid()),
      ended: data.ended,
    };
  }

  public async history(id: number): Promise<Bid[]> {
    return (
      await prisma.bid.findMany({
        where: { auctionId: id, returned: false },
        select: { address: true, amount: true },
      })
    ).map((b) => ({
      address: b.address,
      amount: ethers.formatEther(b.amount),
    }));
  }

  public async rawBid(id: number, value: string): Promise<string> {
    const { contract } = await this.contract(id);
    const tx = await contract.bid.populateTransaction({
      value: ethers.parseEther(value),
    });
    return Transaction.from(tx).unsignedSerialized;
  }

  public async bid(
    id: number,
    userId: number,
    signedTx: string,
  ): Promise<void> {
    const { data, contract } = await this.contract(id);

    const signature = contract.bid.fragment.selector;
    const tx = ethers.Transaction.from(signedTx);
    if (
      !tx.isSigned() ||
      tx.value === 0n ||
      tx.to !== (await contract.getAddress()) ||
      signature.toLowerCase() !== tx.data.slice(0, 10).toLowerCase()
    ) {
      throw new ApiError(400, 'Invalid transaction format');
    }
    if (tx.value <= data.highestBid) {
      throw new ApiError(422, 'Value is less than highest bid');
    }

    // FIXME: note above
    await this.provider.call(tx);
    await prisma.$transaction([
      prisma.bid.create({
        data: {
          ownerId: userId,
          auctionId: id,
          address: tx.from,
          amount: tx.value,
          returned: false,
        },
      }),
      prisma.auction.update({
        where: { id: id },
        data: { highestBid: tx.value },
      }),
    ]);
  }

  public async rawWithdraw(id: number, bidId: number): Promise<string> {
    const bid = await prisma.bid.findUnique({
      where: { id: bidId, auctionId: id },
    });
    if (bid === null) {
      throw new ApiError(404, 'bid not found');
    }
    if (bid.returned) {
      throw new ApiError(409, 'bid is already withdrawn');
    }
    const { contract } = await this.contract(id);
    const tx = await contract.bid.populateTransaction();
    return Transaction.from(tx).unsignedSerialized;
  }

  public async withdraw(
    id: number,
    bidId: number,
    userId: number,
    signedTx: string,
  ): Promise<boolean> {
    /*
     * Note: This logic (selecting then updating) can cause a withdraw to be called twice
     *        It is not a serious problem as it will be called on blockchain, and second call is no-op,
     *        so there is no double spending problem, but it should be improved
     */
    const bid = await prisma.bid.findUnique({
      where: { id: bidId, auctionId: id },
    });
    if (bid === null) {
      throw new ApiError(404, 'bid not found');
    }
    if (bid.returned) {
      throw new ApiError(409, 'bid is already withdrawn');
    }
    const { contract } = await this.contract(id);

    const signature = contract.withdraw.fragment.selector;
    const tx = ethers.Transaction.from(signedTx);
    if (
      !tx.isSigned() ||
      tx.value != 0n ||
      tx.to !== (await contract.getAddress()) ||
      signature.toLowerCase() !== tx.data.slice(0, 10).toLowerCase()
    ) {
      throw new ApiError(400, 'Invalid transaction format');
    }

    if (tx.from != bid.address || bid.ownerId != userId) {
      throw new ApiError(403, 'bid is not for current user');
    }

    // FIXME: note above
    const txr = await this.provider.call(tx);
    const result = contract.interface.decodeFunctionResult(
      'withdraw',
      txr,
    )[0] as boolean;
    await prisma.bid.update({
      where: { id: bid.id },
      data: {
        returned: result,
      },
    });

    return result;
  }

  public async end(id: number): Promise<string> {
    const { data, contract } = await this.contract(id);
    const now = new Date();
    if (now < data.endTime) {
      throw new ApiError(422, 'Auction cannot be ended yet');
    }
    if (data.ended) {
      throw new ApiError(422, 'Auction has been ended before');
    }

    // FIXME: note above
    const tx = await contract.auctionEnd();
    prisma.auction.update({ where: { id: id }, data: { ended: true } });

    return tx.hash;
  }

  // This function is meant only for testing purposes
  public async sign(privateKey: string, unsignedTx: string): Promise<string> {
    const signer = new ethers.Wallet(privateKey, this.provider);
    const tx = Transaction.from(unsignedTx);
    const btx = await signer.populateTransaction({
      value: tx.value,
      to: tx.to,
      data: tx.data,
    });
    return await signer.signTransaction(btx);
  }

  private async contract(id: number) {
    const data = await prisma.auction.findUnique({
      where: { id: id },
    });
    if (data === null) {
      throw new ApiError(404, 'Contract not found');
    }
    return {
      data,
      contract: await hre.ethers.getContractAt(
        'SimpleAuction',
        data.address,
        this.signer,
      ),
    };
  }
}

export interface AuctionStatus {
  readonly endTime: Date;
  readonly ended: boolean;
  readonly highestBid: string;
}

export interface Bid {
  readonly address: string;
  readonly amount: string;
}
