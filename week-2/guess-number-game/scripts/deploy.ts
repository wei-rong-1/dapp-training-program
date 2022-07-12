import { ethers } from "hardhat";

import { Game } from "../typechain-types"

async function main() {
  let depositAmount = ethers.utils.parseEther("1");
  let nonce = ethers.utils.hexlify(ethers.utils.randomBytes(32));
  let number = Math.floor(Math.random() * 1000);
  let nonceHash = ethers.utils.keccak256(nonce);
  let nonceNumHash = ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32', 'uint16'], [nonce, number]));
  let playerNum = 2;

  const GameFactory = await ethers.getContractFactory("Game");
  const game:Game = await GameFactory.deploy(nonceHash, nonceNumHash, playerNum, { value: depositAmount });

  await game.deployed();

  console.log("A new game deployed to:", game.address);
  console.log("Player Number: ", playerNum);
  console.log("Nonce: ", nonce);
  console.log("Number: ", number);
  console.log("Nonce Hash: ", nonceHash);
  console.log("Nonce Number Hash: ", nonceNumHash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
