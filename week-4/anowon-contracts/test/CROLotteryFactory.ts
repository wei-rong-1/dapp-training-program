import { mine, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { getHasherContract } from "./helpers";

import { CROLotteryFactory, DummyWitnet, DummyTCRO, Verifier } from "../typechain-types";

describe("CROLotteryFactory", function () {
  async function deployFactoryFixture() {
    const [owner, ...otherAccounts] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("CROLotteryFactory");
    const DummyWitnetFactory = await ethers.getContractFactory("DummyWitnet");
    const DummyTCROFactory = await ethers.getContractFactory("DummyTCRO");
    const VerifierFactory = await ethers.getContractFactory("Verifier");
    const Hasher = await getHasherContract();

    const witnet:DummyWitnet = await DummyWitnetFactory.deploy();
    const tCRO:DummyTCRO = await DummyTCROFactory.deploy();
    const verifier:Verifier = await VerifierFactory.deploy();
    const hasher = await Hasher.deploy();

    const instance:CROLotteryFactory = await factory.deploy(
      10,
      hasher.address,
      verifier.address,
      witnet.address,
      tCRO.address,
    );

    return { lotteryFactory: instance, owner, otherAccounts };
  }

  it("works", async function () {
    const { lotteryFactory, owner, otherAccounts } = await loadFixture(deployFactoryFixture);

    const nonce = ethers.utils.randomBytes(32);
    const nonceHash = ethers.utils.keccak256(nonce);
    
    expect(await lotteryFactory.owner()).to.be.eq(owner.address);

    await lotteryFactory.createLottery(
      nonceHash,
      ethers.utils.parseEther('10'),
      50,
      500,
    )
    expect(await lotteryFactory.lotteryCount()).to.be.eq(1);
    
    const lottery = await ethers.getContractAt('CROLottery', await lotteryFactory.lottery(0))
    expect(await lottery.nonceHash()).to.be.eq(nonceHash);
  });
});