import { ethers } from "hardhat";

export async function signChequeInfo(
  chequeInfo: any,
  contract: any,
  signer: any
) {
  const message = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["bytes32", "address", "address", "uint", "address", "uint32", "uint32"],
      [
        chequeInfo.chequeId,
        chequeInfo.payer,
        chequeInfo.payee,
        chequeInfo.amount,
        contract.address,
        chequeInfo.validFrom,
        chequeInfo.validThru,
      ]
    )
  );

  const signature = await signer.signMessage(ethers.utils.arrayify(message));

  return signature;
}

export async function signSignOverInfo(
  signOverInfo: any,
  signer: any
) {
  const message = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["uint", "uint8", "bytes32", "address", "address"],
      [
        0xFFFFDEAD,
        signOverInfo.counter,
        signOverInfo.chequeId,
        signOverInfo.oldPayee,
        signOverInfo.newPayee,
      ]
    )
  );

  const signature = await signer.signMessage(ethers.utils.arrayify(message));

  return signature;
}
