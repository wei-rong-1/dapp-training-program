import { ethers } from "hardhat";

async function main() {
  const [owner, ...otherAccounts] = await ethers.getSigners();
  // TODO
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
