import { mine, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, BytesLike } from "ethers";

import { FruitStand } from "../typechain-types";

describe("FruitStand", function () {

  it("works", async function () {
    let tx, txReceipt;
    const [user1, user2, user3, ...otherAccounts] = await ethers.getSigners();

    const WaterFactory = await ethers.getContractFactory("WATER");
    const water = await WaterFactory.deploy(ethers.utils.parseEther('1'));
    txReceipt = await water.deployTransaction.wait()
    console.log("deploy water gas used: ", txReceipt.gasUsed.toString())
    
    const MelonFactory = await ethers.getContractFactory("MELON");
    const melon = await MelonFactory.deploy(ethers.utils.parseEther('1000000000000000000000000000000000000000000000'));
    txReceipt = await water.deployTransaction.wait()
    console.log("deploy melon gas used: ", txReceipt.gasUsed.toString())

    const FruitStandFactory = await ethers.getContractFactory("FruitStand");
    const fruitStand:FruitStand = await FruitStandFactory.deploy(water.address, melon.address);
    txReceipt = await fruitStand.deployTransaction.wait()
    console.log("deploy fruitStand gas used: ", txReceipt.gasUsed.toString())

    tx = await melon.connect(user1).transfer(fruitStand.address, await melon.totalSupply());
    await tx.wait()

    tx = await water.connect(user1).transfer(user2.address, 100000);
    await tx.wait()

    tx = await water.connect(user2).approve(fruitStand.address, 100000);
    await tx.wait()

    const test = async (stakeAmount:BigNumber, blockPassed:number) => {
      let tx, txReceipt;
      console.log(`case { stake: ${stakeAmount}, block: ${blockPassed} }`)

      // stake
      tx = await fruitStand.connect(user2).stake(stakeAmount)
      txReceipt = await tx.wait()
      console.log("stake gas used: ", txReceipt.gasUsed.toString())

      let i = blockPassed;
      while (i > 0) {
        await mine(i > 10 ? 10 : i);
        i -= 10;
      }
      
      // unstake
      tx = await fruitStand.connect(user2).unstake()
      txReceipt = await tx.wait()
      console.log("unstake gas used: ", txReceipt.gasUsed.toString())
    }

    await test(BigNumber.from(5), 5);
    await test(BigNumber.from(5), 20);
    await test(BigNumber.from(5), 50);
    await test(BigNumber.from(1), 100);
    await test(BigNumber.from(1), 200);
    await test(BigNumber.from(1), 350);
  });
});
