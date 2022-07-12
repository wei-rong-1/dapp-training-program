import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BytesLike } from "ethers";

import { Game } from "../typechain-types"

export interface GameDeploymentOption {
  deposit?: number;
  nonce?: BytesLike;
  number?: number;
  playerNum?: number;
  nonceHash?: string;
  nonceNumHash?: string;
}

describe("Game", function () {
  async function deployGame(args:GameDeploymentOption = {}) {
    let deposit = args.deposit || ethers.utils.parseEther("1");
    let nonce = args.nonce || ethers.utils.hexlify(ethers.utils.randomBytes(32));
    let number = args.number || Math.floor(Math.random() * 1000);
    let nonceHash = ethers.utils.keccak256(nonce);
    let nonceNumHash = ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32', 'uint16'], [nonce, number]));
    let playerNum = args.playerNum || 2;
    let options = { deposit, nonce, number, nonceHash, nonceNumHash, playerNum }

    const [owner, ...otherAccounts] = await ethers.getSigners();
    const GameFactory = await ethers.getContractFactory("Game");
    const game:Game = await GameFactory.deploy(nonceHash, nonceNumHash, playerNum, { value: deposit });

    return { game, owner, options, otherAccounts };
  }

  async function deployGameFixture1() {
    return await deployGame({
      number: 999,
      nonce: ethers.utils.hexZeroPad(ethers.utils.toUtf8Bytes('HELLO'), 32)
    })
  }

  async function deployGameFixture500() {
    return await deployGame({
      number: 500,
      nonce: ethers.utils.hexZeroPad(ethers.utils.toUtf8Bytes('HELLO'), 32)
    })
  }

  async function deployGameFixture1415() {
    return await deployGame({
      number: 1415,
      nonce: ethers.utils.hexZeroPad(ethers.utils.toUtf8Bytes('HELLO'), 32)
    })
  }


  // Case 1
  it("should be player2 who wins the game and receives 3 Ether as rewards", async function () {
    const { game, owner, otherAccounts, options: { nonce, number } } = await loadFixture(deployGameFixture1);
    const [ player1, player2 ] = otherAccounts;
    await game.connect(player1).guess(800, { value: ethers.utils.parseEther("1") })
    await game.connect(player2).guess(900, { value: ethers.utils.parseEther("1") })

    const player2BalanceBefore = await ethers.provider.getBalance(player2.address)
    await expect(game.reveal(nonce, number)).to.not.reverted
    const player2BalanceAfter = await ethers.provider.getBalance(player2.address)
    
    expect(player2BalanceAfter.sub(player2BalanceBefore)).to.equal(ethers.utils.parseEther("3"))
  });
  
  // Case 2
  it("should failed when not attach 1 Ether as the deposit value.", async function () {
    const { game, owner, otherAccounts, options: { nonce, number } } = await loadFixture(deployGameFixture1);
    const [ player1, player2 ] = otherAccounts;
    await expect(game.connect(player1).guess(800, { value: ethers.utils.parseEther("2") })).to.be.revertedWith("mismatched deposit")
    await expect(game.connect(player2).guess(900, { value: ethers.utils.parseEther("1") })).to.not.reverted
  });

  // Case 3
  it("should be player 1 and 2 both receive 1.5 Ether evenly", async function () {
    const { game, owner, otherAccounts, options: { nonce, number } } = await loadFixture(deployGameFixture500);
    const [ player1, player2 ] = otherAccounts;
    await game.connect(player1).guess(450, { value: ethers.utils.parseEther("1") })
    await game.connect(player2).guess(550, { value: ethers.utils.parseEther("1") })

    const player1BalanceBefore = await ethers.provider.getBalance(player1.address)
    const player2BalanceBefore = await ethers.provider.getBalance(player2.address)
    await expect(game.reveal(nonce, number)).to.not.reverted
    const player1BalanceAfter = await ethers.provider.getBalance(player1.address)
    const player2BalanceAfter = await ethers.provider.getBalance(player2.address)
    
    expect(player1BalanceAfter.sub(player1BalanceBefore)).to.equal(ethers.utils.parseEther("1.5"))
    expect(player2BalanceAfter.sub(player2BalanceBefore)).to.equal(ethers.utils.parseEther("1.5"))
  });

  // Case 4
  it("should divide rewards evenly since the host does not follow the rule", async function () {
    const { game, owner, otherAccounts, options: { nonce, number } } = await loadFixture(deployGameFixture1415);
    const [ player1, player2 ] = otherAccounts;
    await game.connect(player1).guess(1, { value: ethers.utils.parseEther("1") })
    await game.connect(player2).guess(2, { value: ethers.utils.parseEther("1") })

    const player1BalanceBefore = await ethers.provider.getBalance(player1.address)
    const player2BalanceBefore = await ethers.provider.getBalance(player2.address)
    await expect(game.reveal(nonce, number)).to.not.reverted
    const player1BalanceAfter = await ethers.provider.getBalance(player1.address)
    const player2BalanceAfter = await ethers.provider.getBalance(player2.address)

    expect(player1BalanceAfter.sub(player1BalanceBefore)).to.equal(ethers.utils.parseEther("1.5"))
    expect(player2BalanceAfter.sub(player2BalanceBefore)).to.equal(ethers.utils.parseEther("1.5"))
  });
});


