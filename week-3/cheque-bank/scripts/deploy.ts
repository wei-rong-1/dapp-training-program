import { ethers } from "hardhat";

import { ChequeBankImplement } from "../typechain-types";

async function main() {
  const [owner, ...otherAccounts] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("ChequeBankImplement");
  const chequeBank:ChequeBankImplement = await factory.deploy();

  console.log(`ChequeBank contract address is ${chequeBank.address}`)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
