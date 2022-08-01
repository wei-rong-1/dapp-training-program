import { ethers } from "ethers";
import buildPedersenHash from "./PedersenHash"
import buildMimcSponge from "./MimcSponge"
import * as snarkjs from "snarkjs";

const {
    utils: { unstringifyBigInts },
  } = require("ffjavascript");

const { MerkleTree } = require("fixed-merkle-tree");

export async function pedersenHash(data) {
  const pedersen = await buildPedersenHash();
  const babyJub = pedersen.babyJub;
  const point = babyJub.F.toString(babyJub.unpackPoint(pedersen.hash(data))[0]);

  return ethers.BigNumber.from(point).toHexString();
}

export async function merkleTree(data) {
  const mimcsponge = await buildMimcSponge();

  const tree = new MerkleTree(10, data, {
    hashFunction: (left, right) =>
      mimcsponge.F.toString(mimcsponge.multiHash([left, right])),
    zeroElement:
      "20343323298587817426263677225246066699666576009463223639062948340668151826010",
  });

  return tree;
}

export async function getNullifierHash(nullifier) {
  const preimage = ethers.utils
    .zeroPad(ethers.utils.arrayify(ethers.BigNumber.from(nullifier)), 31)
    .reverse();
  return await pedersenHash(preimage);
}

export async function getCommitment(nullifier, secret) {
  const preimage = ethers.utils.concat([
    ethers.utils
      .zeroPad(ethers.utils.arrayify(ethers.BigNumber.from(nullifier)), 31)
      .reverse(),
    ethers.utils
      .zeroPad(ethers.utils.arrayify(ethers.BigNumber.from(secret)), 4)
      .reverse(),
  ]);
  return await pedersenHash(preimage);
}

export async function generateProof(input) {
  const { proof } = await snarkjs.groth16.fullProve(
    input,
    "/proof/withdraw.wasm",
    "/proof/withdraw_final.zkey"
  );

  const pf = unstringifyBigInts(proof);
  const format = (i) => {
    return ethers.utils.hexZeroPad(ethers.BigNumber.from(i).toHexString(), 32);
  };

  return [
    format(pf.pi_a[0]),
    format(pf.pi_a[1]),
    format(pf.pi_b[0][1]),
    format(pf.pi_b[0][0]),
    format(pf.pi_b[1][1]),
    format(pf.pi_b[1][0]),
    format(pf.pi_c[0]),
    format(pf.pi_c[1]),
  ];
}
