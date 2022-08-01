import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployFunction: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { getNamedAccounts, deployments, network } = hre;
  const { deployer } = await getNamedAccounts();
  let tx;

  if (network.tags.devnet) {
    console.log(
      `Skip setup for CROLotteryFactory on dev enviroment`
    );
    return;
  }

  let witnetAddr;
  let tCROAddr;

  if (network.tags.testnet) {
    witnetAddr = "0x0017A464A86f48B342Cae3b8Fe29cFCDaA7b0643";
    tCROAddr = ethers.constants.AddressZero; // Unknown
  }

  if (network.tags.mainnet) {
    witnetAddr = "0x3737be6FcFf5B3B0f9DCc9a9ae1Da56561D0d0d3";
    tCROAddr = "0xeAdf7c01DA7E93FdB5f16B0aa9ee85f978e89E95";
  }

  if (network.tags.hardhat) { // forked network
    // witnetAddr = "0x3737be6FcFf5B3B0f9DCc9a9ae1Da56561D0d0d3";
    // tCROAddr = "0xeAdf7c01DA7E93FdB5f16B0aa9ee85f978e89E95";
    return
  }

  const CROLotteryFactory = await deployments.get("CROLotteryFactory");
  const factory = await hre.ethers.getContractAt(
    CROLotteryFactory.abi,
    CROLotteryFactory.address
  );

  tx = await factory.setWitnet(witnetAddr, { gasPrice: "5000000000000" });
  console.log(
    `Set Witnet Contract address in CROLotteryFactory to ${witnetAddr}`
  );
  await tx.wait();

  tx = await factory.setTCRO(tCROAddr, { gasPrice: "5000000000000" });
  console.log(`Set tCRO Contract address in CROLotteryFactory to ${tCROAddr}`);
  await tx.wait();
};

export default deployFunction;
deployFunction.tags = ["setup"];
deployFunction.dependencies = ["factory"];
