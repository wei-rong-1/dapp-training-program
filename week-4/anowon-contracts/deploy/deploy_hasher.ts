import * as fs from "fs";
import * as path from "path";
import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployFunction: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { getNamedAccounts, deployments } = hre;
  const { deployer } = await getNamedAccounts();
  const { save, log } = deployments;

  require(path.join(__dirname, "../scripts/compileHasher.ts"));

  let json = fs.readFileSync(
    path.join(__dirname, "../artifacts/contracts/Hasher.sol/Hasher.json")
  );
  let artifact = JSON.parse(String(json));

  const signer = await ethers.getSigner(deployer);
  const Hasher = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    signer
  );
  const hasher = await Hasher.deploy({ gasPrice: 5000000000000 });

  const proxyDeployments = {
    address: hasher.address,
    ...artifact,
  };

  log(
    `deploying "Hasher" (tx: ${hasher.deployTransaction.hash})...: deployed at ${hasher.address}`
  );

  await save("Hasher", proxyDeployments);

  return true;
};

export default deployFunction;
deployFunction.id = "deploy_hasher";
deployFunction.tags = ["hasher"];
