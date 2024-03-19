import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("Auction", function () {
  async function deployOneYearLockFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const Auction = await hre.ethers.getContractFactory("SimpleAuction");
    const auction = await Auction.deploy(ONE_YEAR_IN_SECS, owner.address);
    const endTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    return { auction, endTime, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right endTime", async function () {
      const { auction, endTime } = await loadFixture(deployOneYearLockFixture);

      expect(await auction.auctionEndTime()).to.equal(endTime);
    });

    it("Should set the right owner", async function () {
      const { auction, owner } = await loadFixture(deployOneYearLockFixture);

      expect(await auction.beneficiary()).to.equal(owner.address);
    });

    it("Should be initialized with 0 funds", async function () {
      const { auction } = await loadFixture(
        deployOneYearLockFixture
      );

      expect(await hre.ethers.provider.getBalance(auction.target)).to.equal(
        0n
      );
    });
  });

});
