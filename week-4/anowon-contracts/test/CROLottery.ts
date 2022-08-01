import { mine, loadFixture, setBalance } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { getHasherContract, pedersenHash, merkleTree,
        getCommitment, getNullifierHash, generateProof } from "./helpers";
import { CROLottery, DummyWitnet, DummyTCRO, Verifier } from "../typechain-types";

describe("CROLottery", function () {
  async function deployLotteryFixture() {
    const [owner, ...otherAccounts] = await ethers.getSigners();
    const CROLotteryFactory = await ethers.getContractFactory("CROLottery");
    const DummyWitnetFactory = await ethers.getContractFactory("DummyWitnet");
    const DummyTCROFactory = await ethers.getContractFactory("DummyTCRO");
    const VerifierFactory = await ethers.getContractFactory("Verifier");
    const Hasher = await getHasherContract();

    const witnet:DummyWitnet = await DummyWitnetFactory.deploy();
    const tCRO:DummyTCRO = await DummyTCROFactory.deploy();
    const verifier:Verifier = await VerifierFactory.deploy();
    const hasher = await Hasher.deploy();

    const nonce = "0x0000000000000000000000000000000000000000000000000000000000000003";
    const nonceHash = ethers.utils.keccak256(nonce);

    const lottery:CROLottery = await CROLotteryFactory.deploy(
      1,
      ethers.utils.parseEther('10'),
      10,
      30,
      nonceHash,
      10,
      verifier.address,
      hasher.address,
      witnet.address,
      tCRO.address,
    );

    return { lottery, owner, otherAccounts, tCRO };
  }
  
  const COMMITS = [
    ["0x00000000000000000000000000000000000000000000000000000000000001", "0x00000010"],
    ["0x00000000000000000000000000000000000000000000000000000000000002", "0x00000020"],
    ["0x00000000000000000000000000000000000000000000000000000000000003", "0x00000030"],
  ]

  const commitFixture =  async (i:number) => {
    const nullifier = COMMITS[i][0];
    const secret = COMMITS[i][1];
    const nullifierHash = await getNullifierHash(nullifier)
    const commitment = await getCommitment(nullifier, secret)
    return { nullifier, secret, nullifierHash, commitment }
  }

  async function claimFixture(
    recipient:any,
    winningNumber:any,
    commitFt: any,
    commitments: any
  ) {
    const { nullifier, secret, nullifierHash, commitment } = commitFt;
    const index = commitments.indexOf(commitment);
    const myNumber = ethers.BigNumber.from(secret)
    const difference = winningNumber.gt(myNumber) ? winningNumber.sub(myNumber) : myNumber.sub(winningNumber)
    const tree = await merkleTree(commitments.map((i:string) => ethers.BigNumber.from(i).toString()));
    const { pathElements, pathIndices } = tree.path(index)
    const proofData = await generateProof({
      root: tree.root,
      winningNumber: ethers.utils.hexZeroPad(winningNumber.toHexString(), 32),
      difference: ethers.utils.hexZeroPad(difference.toHexString(), 32),
      nullifierHash,
      recipient: ethers.utils.hexZeroPad(recipient, 32),
      nullifier: ethers.utils.hexZeroPad(nullifier, 32),
      secret: ethers.utils.hexZeroPad(secret, 32),
      pathElements,
      pathIndices,
    })

    return {
      difference,
      root: tree.root,
      nullifierHash,
      proofData,
    }
  }

  it("works when commit", async function () {
    const { lottery, owner, otherAccounts } = await loadFixture(deployLotteryFixture);
    const [ user1, user2 ] = otherAccounts;
    const { commitment } = await commitFixture(0);

    await lottery.connect(user1).commit(commitment, { value: ethers.utils.parseEther("10") });

    expect(await lottery.commitments(commitment)).to.be.true;
    expect(await lottery.playerCount()).to.be.eq(1);

    const player = await lottery.players(0);
    expect(player.recipient).to.be.eq(user1.address);
  });

  it("fails when commit after prepare", async function () {
    const { lottery, owner, otherAccounts } = await loadFixture(deployLotteryFixture);
    const [ user1, user2, user3 ] = otherAccounts;
    const { commitment:commitment1 } = await commitFixture(0);
    const { commitment:commitment2 } = await commitFixture(1);
    await lottery.connect(user1).commit(commitment1, { value: ethers.utils.parseEther("10") });
    
    await mine(11);
    await lottery.prepare({ value: ethers.utils.parseEther("100") });

    await expect(lottery.connect(user2).commit(commitment2, { value: ethers.utils.parseEther("10") }))
      .to.revertedWith("Statusable: status is not right");

    expect(await lottery.playerCount()).to.be.eq(1);
  });

  it("works when reveal", async function () {
    const { lottery, owner, otherAccounts } = await loadFixture(deployLotteryFixture);
    const [ user1, user2, user3 ] = otherAccounts;
    const { commitment:commitment1 } = await commitFixture(0);
    await lottery.connect(user1).commit(commitment1, { value: ethers.utils.parseEther("10") });

    await expect(lottery.reveal("0x0000000000000000000000000000000000000000000000000000000000000003")).to.revertedWith(
      "Statusable: status is not right"
    );

    await mine(11);
    await lottery.prepare({ value: ethers.utils.parseEther("100") });
    await lottery.reveal("0x0000000000000000000000000000000000000000000000000000000000000003");

    expect(await lottery.winningNumber()).to.be.gt(0);
  });

  it("works when claim", async function () {
    const { lottery, otherAccounts } = await loadFixture(deployLotteryFixture);
    const [ user1, user2, user3 ] = otherAccounts;
    const { commitment, nullifier, secret, nullifierHash } = await commitFixture(0);
    await lottery.connect(user1).commit(commitment, { value: ethers.utils.parseEther("10") });

    await mine(11);
    await lottery.prepare({ value: ethers.utils.parseEther("100") });
    await lottery.reveal("0x0000000000000000000000000000000000000000000000000000000000000003");

    const winningNumber = ethers.BigNumber.from(await lottery.winningNumber())
    const myNumber = ethers.BigNumber.from(secret)
    const difference = winningNumber.gt(myNumber) ? winningNumber.sub(myNumber) : myNumber.sub(winningNumber)
    const tree = await merkleTree([commitment]);
    const { pathElements, pathIndices } = tree.path(0)
    const proofData = await generateProof({
      root: tree.root,
      winningNumber: ethers.utils.hexZeroPad(winningNumber.toHexString(), 32),
      difference: ethers.utils.hexZeroPad(difference.toHexString(), 32),
      nullifierHash,
      recipient: ethers.utils.hexZeroPad(user2.address, 32),
      nullifier: ethers.utils.hexZeroPad(nullifier, 32),
      secret: ethers.utils.hexZeroPad(secret, 32),
      pathElements,
      pathIndices,
    })

    await lottery.connect(user2).claim(
      ethers.BigNumber.from(tree.root).toHexString(),
      difference,
      nullifierHash,
      user2.address,
      proofData
    )

    expect(await lottery.minimumDifference()).to.be.eq(difference.toNumber())
    expect(await lottery.winnerCount()).to.be.eq(1)
    expect((await lottery.winners(0)).recipient).to.be.eq(user2.address)
  });


  
  it("works when finalize", async function () {
    const { lottery, tCRO, otherAccounts } = await loadFixture(deployLotteryFixture);
    const [ user1, user2, user3, user4 ] = otherAccounts;
    const commitFx1 = await commitFixture(0);
    const commitFx2 = await commitFixture(1);
    const commitFx3 = await commitFixture(2);
    const { commitment:commitment1 } = commitFx1;
    const { commitment:commitment2 } = commitFx2;
    const { commitment:commitment3 } = commitFx3;
    const commitments = [commitment1, commitment2, commitment3]
    await lottery.connect(user1).commit(commitment1, { value: ethers.utils.parseEther("10") });
    await lottery.connect(user2).commit(commitment2, { value: ethers.utils.parseEther("10") });
    await lottery.connect(user3).commit(commitment3, { value: ethers.utils.parseEther("10") });

    await mine(11);
    await lottery.prepare({ value: ethers.utils.parseEther("100") });
    await lottery.reveal("0x0000000000000000000000000000000000000000000000000000000000000003");

    const winningNumber = ethers.BigNumber.from(await lottery.winningNumber())

    const claimData1 = await claimFixture(user1.address, winningNumber, commitFx1, commitments);
    const claimData2 = await claimFixture(user2.address, winningNumber, commitFx2, commitments);
    const claimData3 = await claimFixture(user3.address, winningNumber, commitFx3, commitments);

    await lottery.connect(user1).claim(
      ethers.BigNumber.from(claimData1.root).toHexString(),
      claimData1.difference,
      claimData1.nullifierHash,
      user1.address,
      claimData1.proofData
    )

    await lottery.connect(user2).claim(
      ethers.BigNumber.from(claimData2.root).toHexString(),
      claimData2.difference,
      claimData2.nullifierHash,
      user2.address,
      claimData2.proofData
    )

    await lottery.connect(user3).claim(
      ethers.BigNumber.from(claimData3.root).toHexString(),
      claimData3.difference,
      claimData3.nullifierHash,
      user3.address,
      claimData3.proofData
    )

    expect(await lottery.minimumDifference()).to.be.eq(claimData3.difference.toNumber())
    expect(await lottery.playerCount()).to.be.eq(3)
    expect(await lottery.winnerCount()).to.be.eq(1)
    expect((await lottery.winners(0)).recipient).to.be.eq(user3.address)

    await mine(11);
    await mine(11);
    await mine(11);
    await setBalance(tCRO.address, ethers.utils.parseEther("33"));

    const beforeBalance = await ethers.provider.getBalance(user3.address);
    await lottery.finalize()
    const afterBalance = await ethers.provider.getBalance(user3.address);
    expect(afterBalance.sub(beforeBalance)).to.be.eq(ethers.utils.parseEther('3'))
  });

});