import { mine, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { ChequeBankImplement } from "../typechain-types";
import { signChequeInfo, signSignOverInfo } from "./utils";

describe("ChequeBankImplement", function () {

  async function deployChequeBank() {
    const [owner, ...otherAccounts] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("ChequeBankImplement");
    const chequeBank:ChequeBankImplement = await factory.deploy();

    return { chequeBank, owner, otherAccounts };
  }

  const fixtures = {
    chequeInfo1: {
      chequeId: "0xaaa0000000000000000000000000000000000000000000000000000000000000",
      payer: ethers.constants.AddressZero,
      payee: ethers.constants.AddressZero,
      amount: ethers.utils.parseEther("1"),
      validFrom: 0,
      validThru: 0,
    },
    signOverInfo1: {
      counter: 1,
      chequeId: "0xaaa0000000000000000000000000000000000000000000000000000000000000",
      oldPayee: ethers.constants.AddressZero,
      newPayee: ethers.constants.AddressZero,
    }
  }

  it("works when deposit", async function () {
    const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
    const [ user1, user2 ] = otherAccounts;

    const balanceBefore = await chequeBank.balanceOf(user1.address)
    await chequeBank.connect(user1).deposit({ value: ethers.utils.parseEther("1") })
    const balanceAfter = await chequeBank.balanceOf(user1.address)

    expect(balanceAfter.sub(balanceBefore)).to.eq(ethers.utils.parseEther("1"))
  });

  it("fails when deposit nothing", async function () {
    const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
    const [ user1, user2 ] = otherAccounts;

    await expect(chequeBank.connect(user1).deposit({ value: 0 })).to.be.revertedWith(
      "ChequeBankImplement: invalid deposit"
    );
  });

  describe("withdraw", function () {
    it("works when withdraw", async function () {
      const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
      const [ user1, user2 ] = otherAccounts;

      await chequeBank.connect(user1).deposit({ value: ethers.utils.parseEther("2") })
      await chequeBank.connect(user1).withdraw(ethers.utils.parseEther("1"))
      const balanceAfter = await chequeBank.balanceOf(user1.address)
      expect(balanceAfter).to.eq(ethers.utils.parseEther("1"))
    });

    it("works when withdrawTo", async function () {
      const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
      const [ user1, user2 ] = otherAccounts;
      const balanceOfUser2Before = await ethers.provider.getBalance(user2.address)
      await chequeBank.connect(user1).deposit({ value: ethers.utils.parseEther("2") })
      await chequeBank.connect(user1).withdrawTo(ethers.utils.parseEther("1"), user2.address)
      const balanceOfUser1After = await chequeBank.balanceOf(user1.address)
      const balanceOfUser2After = await ethers.provider.getBalance(user2.address)

      expect(balanceOfUser1After).to.eq(ethers.utils.parseEther("1"))
      expect(balanceOfUser2After.sub(balanceOfUser2Before)).to.eq(ethers.utils.parseEther("1"))
    });
  });

  it("works when redeem", async function () {
    const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
    const [ user1, user2 ] = otherAccounts;

    let chequeInfo = { ...fixtures.chequeInfo1, payer: user1.address, payee: user2.address }
    const signature = signChequeInfo(chequeInfo, chequeBank, user1);
    
    await chequeBank.connect(user1).deposit({ value: ethers.utils.parseEther("2") })
    const balanceOfUser2Before = await ethers.provider.getBalance(user2.address)

    await chequeBank.connect(user1).redeem({ chequeInfo, sig: signature })

    const balanceOfUser1After = await chequeBank.balanceOf(user1.address)
    expect(balanceOfUser1After).to.eq(ethers.utils.parseEther("1"))

    const balanceOfUser2After = await ethers.provider.getBalance(user2.address)
    expect(balanceOfUser2After.sub(balanceOfUser2Before)).to.eq(ethers.utils.parseEther("1"))
  });

  it("fails when redeem but insufficient fund", async function () {
    const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
    const [ user1, user2 ] = otherAccounts;

    let chequeInfo = { ...fixtures.chequeInfo1, payer: user1.address, payee: user2.address }
    const signature = signChequeInfo(chequeInfo, chequeBank, user1);

    await chequeBank.connect(user1).deposit({ value: ethers.utils.parseEther("0.5") })

    await expect(chequeBank.connect(user1).redeem({ chequeInfo, sig: signature })).to.revertedWith(
      "ChequeBankImplement: not enough fund"
    )

    await chequeBank.connect(user1).deposit({ value: ethers.utils.parseEther("0.5") })

    await expect(chequeBank.connect(user1).redeem({ chequeInfo, sig: signature })).to.not.reverted;
  });

  it("works when revoke", async function () {
    const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
    const [ user1, user2 ] = otherAccounts;
    const chequeId = "0xaaa0000000000000000000000000000000000000000000000000000000000000"

    await expect(chequeBank.connect(user1).revoke(chequeId)).to.not.reverted;

    expect(await chequeBank.revocationOf(chequeId, user1.address)).to.be.true;
  });

  it("fails when redeem a revoked cheque", async function () {
    const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
    const [ user1, user2 ] = otherAccounts;

    let chequeInfo = { ...fixtures.chequeInfo1, payer: user1.address, payee: user2.address }
    const signature = signChequeInfo(chequeInfo, chequeBank, user1);

    await chequeBank.connect(user1).deposit({ value: ethers.utils.parseEther("2") })
    await chequeBank.connect(user1).revoke(chequeInfo.chequeId)

    await expect(chequeBank.connect(user2).redeem({ chequeInfo, sig: signature })).to.revertedWith(
      "ChequeBankImplement: been revoked by payer"
    )
  });

  it("works when notify sign over", async function () {
    const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
    const [ user1, user2, user3 ] = otherAccounts;
    
    let chequeInfo = { ...fixtures.chequeInfo1, payer: user1.address, payee: user2.address }
    const chequeData = { chequeInfo, sig: signChequeInfo(chequeInfo, chequeBank, user1) };

    let signOverInfo = { ...fixtures.signOverInfo1, oldPayee: user2.address, newPayee: user3.address }
    const signOverData = { signOverInfo, sig: signSignOverInfo(signOverInfo, user2) };

    await expect(chequeBank.connect(user2).notifySignOver(chequeData, signOverData)).to.not.reverted;

    const newPayeeResult = await chequeBank.signedOverOf(signOverInfo.chequeId, signOverInfo.counter, signOverInfo.oldPayee)
    expect(newPayeeResult).to.be.eq(signOverInfo.newPayee);
  });

  it("fails when notify sign over which wrong content", async function () {
    const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
    const [ user1, user2, user3 ] = otherAccounts;
    
    let chequeInfo = { ...fixtures.chequeInfo1, payer: user1.address, payee: user2.address }
    const chequeData = { chequeInfo, sig: signChequeInfo(chequeInfo, chequeBank, user1) };

    let signOverInfo1 = { ...fixtures.signOverInfo1, counter: 7, oldPayee: user2.address, newPayee: user3.address }
    const signOverData1 = { signOverInfo: signOverInfo1, sig: signSignOverInfo(signOverInfo1, user2) };

    let signOverInfo2 = { 
      ...fixtures.signOverInfo1, 
      chequeId: "0xbbb0000000000000000000000000000000000000000000000000000000000000", 
      oldPayee: user2.address,
      newPayee: user3.address
    }
    const signOverData2 = { signOverInfo: signOverInfo2, sig: signSignOverInfo(signOverInfo2, user2) };

    await expect(chequeBank.connect(user2).notifySignOver(chequeData, signOverData1)).to.revertedWith(
      "ChequeBankImplement: invalid signOver counter"
    );

    await expect(chequeBank.connect(user2).notifySignOver(chequeData, signOverData2)).to.revertedWith(
      "ChequeBankImplement: mismatched cheque"
    );
  });

  it("fails when notify different signovers for the same cheque twice", async function () {
    const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
    const [ user1, user2, user3, user4 ] = otherAccounts;
    
    let chequeInfo = { ...fixtures.chequeInfo1, payer: user1.address, payee: user2.address }
    const chequeData = { chequeInfo, sig: signChequeInfo(chequeInfo, chequeBank, user1) };

    let signOverInfo1 = { ...fixtures.signOverInfo1, oldPayee: user2.address, newPayee: user3.address }
    const signOverData1 = { signOverInfo: signOverInfo1, sig: signSignOverInfo(signOverInfo1, user2) };

    let signOverInfo2 = { ...fixtures.signOverInfo1, oldPayee: user2.address, newPayee: user4.address }
    const signOverData2 = { signOverInfo: signOverInfo2, sig: signSignOverInfo(signOverInfo2, user2) };

    let signOverInfo3 = { ...fixtures.signOverInfo1, oldPayee: user3.address, newPayee: user4.address }
    const signOverData3 = { signOverInfo: signOverInfo3, sig: signSignOverInfo(signOverInfo3, user3) };

    await expect(chequeBank.connect(user3).notifySignOver(chequeData, signOverData1)).to.not.reverted;

    await expect(chequeBank.connect(user4).notifySignOver(chequeData, signOverData2)).to.revertedWith(
      "ChequeBankImplement: been signed over"
    );

    await expect(chequeBank.connect(user4).notifySignOver(chequeData, signOverData3)).to.not.reverted;
  });

  it("fails when notify signovers for cheque which revoked by payer", async function () {
    const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
    const [ user1, user2, user3 ] = otherAccounts;
    
    let chequeInfo = { ...fixtures.chequeInfo1, payer: user1.address, payee: user2.address }
    const chequeData = { chequeInfo, sig: signChequeInfo(chequeInfo, chequeBank, user1) };

    let signOverInfo1 = { ...fixtures.signOverInfo1, oldPayee: user2.address, newPayee: user3.address }
    const signOverData1 = { signOverInfo: signOverInfo1, sig: signSignOverInfo(signOverInfo1, user2) };

    await chequeBank.connect(user1).revoke(chequeInfo.chequeId)

    await expect(chequeBank.connect(user2).notifySignOver(chequeData, signOverData1)).to.revertedWith(
      "ChequeBankImplement: payer revoke before payee sign over"
    );
  });

  it("works when check validity of cheque", async function () {
    const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
    const [ user1, user2, user3 ] = otherAccounts;

    let chequeInfo = { ...fixtures.chequeInfo1, payer: user1.address, payee: user2.address }
    const chequeData = { chequeInfo, sig: signChequeInfo(chequeInfo, chequeBank, user1) };

    const validity1 =  await chequeBank.isChequeValid(user2.address, chequeData, []);
    expect(validity1).to.be.false;
    
    await chequeBank.connect(user1).deposit({ value: ethers.utils.parseEther("2") })

    const validity2 =  await chequeBank.isChequeValid(user2.address, chequeData, []);
    expect(validity2).to.be.true;

    const validity3 =  await chequeBank.isChequeValid(user3.address, chequeData, []);
    expect(validity3).to.be.false;
  });

  it("works when check validity of redeemed cheque", async function () {
    const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
    const [ user1, user2 ] = otherAccounts;

    let chequeInfo = { ...fixtures.chequeInfo1, payer: user1.address, payee: user2.address }
    const chequeData = { chequeInfo, sig: signChequeInfo(chequeInfo, chequeBank, user1) };
    await chequeBank.connect(user1).deposit({ value: ethers.utils.parseEther("2") })

    const validity1 =  await chequeBank.isChequeValid(user2.address, chequeData, []);
    expect(validity1).to.be.true;

    await chequeBank.connect(user1).redeem(chequeData)

    const validity2 =  await chequeBank.isChequeValid(user2.address, chequeData, []);
    expect(validity2).to.be.false;
  });

  it("works when check validity of revoked cheque", async function () {
    const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
    const [ user1, user2 ] = otherAccounts;

    let chequeInfo = { ...fixtures.chequeInfo1, payer: user1.address, payee: user2.address }
    const chequeData = { chequeInfo, sig: signChequeInfo(chequeInfo, chequeBank, user1) };
    await chequeBank.connect(user1).deposit({ value: ethers.utils.parseEther("2") })

    const validity1 =  await chequeBank.isChequeValid(user2.address, chequeData, []);
    expect(validity1).to.be.true;

    await chequeBank.connect(user1).revoke(chequeInfo.chequeId)

    const validity2 =  await chequeBank.isChequeValid(user2.address, chequeData, []);
    expect(validity2).to.be.false;
  });

  it("works when check validity of signed over cheque", async function () {
    const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
    const [ user1, user2, user3 ] = otherAccounts;

    let chequeInfo = { ...fixtures.chequeInfo1, payer: user1.address, payee: user2.address }
    const chequeData = { chequeInfo, sig: signChequeInfo(chequeInfo, chequeBank, user1) };

    let signOverInfo = { ...fixtures.signOverInfo1, oldPayee: user2.address, newPayee: user3.address }
    const signOverData = { signOverInfo, sig: signSignOverInfo(signOverInfo, user2) };

    await chequeBank.connect(user1).deposit({ value: ethers.utils.parseEther("2") })

    const validity1 =  await chequeBank.isChequeValid(user3.address, chequeData, [signOverData]);
    expect(validity1).to.be.false;
    
    await chequeBank.connect(user3).notifySignOver(chequeData, signOverData)
    
    const validity2 =  await chequeBank.isChequeValid(user3.address, chequeData, [signOverData]);
    expect(validity2).to.be.true;
  });

  it("works when redeem sign over", async function () {
    const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
    const [ user1, user2, user3 ] = otherAccounts;

    let chequeInfo = { ...fixtures.chequeInfo1, payer: user1.address, payee: user2.address }
    const chequeData = { chequeInfo, sig: signChequeInfo(chequeInfo, chequeBank, user1) };

    let signOverInfo = { ...fixtures.signOverInfo1, oldPayee: user2.address, newPayee: user3.address }
    const signOverData = { signOverInfo, sig: signSignOverInfo(signOverInfo, user2) };

    await chequeBank.connect(user1).deposit({ value: ethers.utils.parseEther("2") })
    await chequeBank.connect(user2).notifySignOver(chequeData, signOverData)
    
    const balanceOfUser2Before = await ethers.provider.getBalance(user2.address)
    const balanceOfUser3Before = await ethers.provider.getBalance(user3.address)

    await expect(chequeBank.connect(user1).redeem(chequeData)).to.be.revertedWith("invalid payee")

    await chequeBank.connect(user1).redeemSignOver(chequeData, [signOverData])

    const balanceOfUser1After = await chequeBank.balanceOf(user1.address)
    expect(balanceOfUser1After).to.eq(ethers.utils.parseEther("1"))

    const balanceOfUser2After = await ethers.provider.getBalance(user2.address)
    const balanceOfUser3After = await ethers.provider.getBalance(user3.address)
    expect(balanceOfUser2After.sub(balanceOfUser2Before)).to.eq(0)
    expect(balanceOfUser3After.sub(balanceOfUser3Before)).to.eq(ethers.utils.parseEther("1"))
  });

  it("works when redeem after sign over multiple times", async function () {
    const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
    const [ user1, user2, user3, user4, user5 ] = otherAccounts;

    let chequeInfo = { ...fixtures.chequeInfo1, payer: user1.address, payee: user2.address }
    const chequeData = { chequeInfo, sig: signChequeInfo(chequeInfo, chequeBank, user1) };

    let signOverInfo1 = { ...fixtures.signOverInfo1, counter: 1, oldPayee: user2.address, newPayee: user3.address }
    const signOverData1 = { signOverInfo: signOverInfo1, sig: signSignOverInfo(signOverInfo1, user2) }

    let signOverInfo2 = { ...fixtures.signOverInfo1, counter: 2, oldPayee: user3.address, newPayee: user4.address }
    const signOverData2 = { signOverInfo: signOverInfo2, sig: signSignOverInfo(signOverInfo2, user3) }

    let signOverInfo3 = { ...fixtures.signOverInfo1, counter: 3, oldPayee: user4.address, newPayee: user5.address }
    const signOverData3 = { signOverInfo: signOverInfo3, sig: signSignOverInfo(signOverInfo3, user4) }

    // Edge case: sign over back to user3
    let signOverInfo4 = { ...fixtures.signOverInfo1, counter: 4, oldPayee: user5.address, newPayee: user3.address }
    const signOverData4 = { signOverInfo: signOverInfo4, sig: signSignOverInfo(signOverInfo4, user5) }

    await chequeBank.connect(user1).deposit({ value: ethers.utils.parseEther("2") })
    await chequeBank.connect(user2).notifySignOver(chequeData, signOverData1)
    await chequeBank.connect(user2).notifySignOver(chequeData, signOverData2)
    await chequeBank.connect(user2).notifySignOver(chequeData, signOverData3)
    await chequeBank.connect(user2).notifySignOver(chequeData, signOverData4)
    
    const balanceOfUser3Before = await ethers.provider.getBalance(user3.address)

    await chequeBank.connect(user1).redeemSignOver(chequeData, [
      signOverData2,
      signOverData1,
      signOverData4,
      signOverData3,
    ])

    const balanceOfUser1After = await chequeBank.balanceOf(user1.address)
    expect(balanceOfUser1After).to.eq(ethers.utils.parseEther("1"))

    const balanceOfUser3After = await ethers.provider.getBalance(user3.address)
    expect(balanceOfUser3After.sub(balanceOfUser3Before)).to.eq(ethers.utils.parseEther("1"))
  });

  it("works when signed over payee redeem although payer revoked the cheque", async function () {
    const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
    const [ user1, user2, user3, user4, user5 ] = otherAccounts;

    let chequeInfo = { ...fixtures.chequeInfo1, payer: user1.address, payee: user2.address }
    const chequeData = { chequeInfo, sig: signChequeInfo(chequeInfo, chequeBank, user1) };

    let signOverInfo1 = { ...fixtures.signOverInfo1, counter: 1, oldPayee: user2.address, newPayee: user3.address }
    const signOverData1 = { signOverInfo: signOverInfo1, sig: signSignOverInfo(signOverInfo1, user2) }

    await chequeBank.connect(user1).deposit({ value: ethers.utils.parseEther("2") })
    await chequeBank.connect(user2).notifySignOver(chequeData, signOverData1)
    await chequeBank.connect(user1).revoke(chequeInfo.chequeId)

    const balanceOfUser3Before = await ethers.provider.getBalance(user3.address)

    await expect(chequeBank.connect(user1).redeemSignOver(chequeData, [signOverData1])).to.not.reverted

    const balanceOfUser1After = await chequeBank.balanceOf(user1.address)
    expect(balanceOfUser1After).to.eq(ethers.utils.parseEther("1"))

    const balanceOfUser3After = await ethers.provider.getBalance(user3.address)
    expect(balanceOfUser3After.sub(balanceOfUser3Before)).to.eq(ethers.utils.parseEther("1"))
  });

  it("works when signed over payee redeem although old payee revoked the cheque", async function () {
    const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
    const [ user1, user2, user3, user4, user5 ] = otherAccounts;

    let chequeInfo = { ...fixtures.chequeInfo1, payer: user1.address, payee: user2.address }
    const chequeData = { chequeInfo, sig: signChequeInfo(chequeInfo, chequeBank, user1) };

    let signOverInfo1 = { ...fixtures.signOverInfo1, counter: 1, oldPayee: user2.address, newPayee: user3.address }
    const signOverData1 = { signOverInfo: signOverInfo1, sig: signSignOverInfo(signOverInfo1, user2) }

    let signOverInfo2 = { ...fixtures.signOverInfo1, counter: 2, oldPayee: user3.address, newPayee: user4.address }
    const signOverData2 = { signOverInfo: signOverInfo2, sig: signSignOverInfo(signOverInfo2, user3) }

    await chequeBank.connect(user1).deposit({ value: ethers.utils.parseEther("2") })
    await chequeBank.connect(user2).notifySignOver(chequeData, signOverData1)
    await chequeBank.connect(user2).revoke(signOverInfo1.chequeId)

    const validity1 =  await chequeBank.isChequeValid(user3.address, chequeData, [signOverData1]);
    expect(validity1).to.be.true;

    await chequeBank.connect(user3).notifySignOver(chequeData, signOverData2)
    await chequeBank.connect(user3).revoke(signOverInfo1.chequeId)

    const validity2 =  await chequeBank.isChequeValid(user4.address, chequeData, [signOverData1, signOverData2]);
    expect(validity2).to.be.true;

    const balanceOfUser4Before = await ethers.provider.getBalance(user4.address)

    await expect(chequeBank.connect(user1).redeemSignOver(chequeData, [
      signOverData2,
      signOverData1
    ])).to.not.reverted

    const balanceOfUser1After = await chequeBank.balanceOf(user1.address)
    expect(balanceOfUser1After).to.eq(ethers.utils.parseEther("1"))

    const balanceOfUser4After = await ethers.provider.getBalance(user4.address)
    expect(balanceOfUser4After.sub(balanceOfUser4Before)).to.eq(ethers.utils.parseEther("1"))
  });

  it("fails when signed over payee redeem but the payee revoked the cheque", async function () {
    const { chequeBank, otherAccounts} = await loadFixture(deployChequeBank);
    const [ user1, user2, user3 ] = otherAccounts;

    let chequeInfo = { ...fixtures.chequeInfo1, payer: user1.address, payee: user2.address }
    const chequeData = { chequeInfo, sig: signChequeInfo(chequeInfo, chequeBank, user1) };

    let signOverInfo1 = { ...fixtures.signOverInfo1, counter: 1, oldPayee: user2.address, newPayee: user3.address }
    const signOverData1 = { signOverInfo: signOverInfo1, sig: signSignOverInfo(signOverInfo1, user2) }

    await chequeBank.connect(user1).deposit({ value: ethers.utils.parseEther("2") })
    await chequeBank.connect(user2).notifySignOver(chequeData, signOverData1)
    await chequeBank.connect(user3).revoke(signOverInfo1.chequeId)

    await expect(chequeBank.connect(user1).redeemSignOver(chequeData, [
      signOverData1
    ])).to.revertedWith("ChequeBankImplement: been revoked by payee")

    const balanceOfUser1After = await chequeBank.balanceOf(user1.address)
    expect(balanceOfUser1After).to.eq(ethers.utils.parseEther("2"))
  });
});