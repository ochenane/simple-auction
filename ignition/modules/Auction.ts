import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ONE_DAY = 24 * 60 * 60;

const AuctionModule = buildModule("SimpleAuction", (m) => {
  const biddingTime = m.getParameter("biddingTime", ONE_DAY);
  const beneficiary = m.getParameter("beneficiary");

  const lock = m.contract("SimpleAuction", [biddingTime, beneficiary]);
  return { lock };
});

export default AuctionModule;
