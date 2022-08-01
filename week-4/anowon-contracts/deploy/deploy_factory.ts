import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployFunction: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { getNamedAccounts, deployments, network } = hre;
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;

  const Hasher = await deployments.get("Hasher");
  const Verifier = await deployments.get("Verifier");
  const DummyWitnet = await deployments.get("DummyWitnet");
  const DummyTCRO = await deployments.get("DummyTCRO");

  await deploy("CROLotteryFactory", {
    from: deployer,
    args: [
      10, // levels
      Hasher.address,
      Verifier.address,
      DummyWitnet.address,
      DummyTCRO.address,
    ],
    log: true,
    gasPrice: '5000000000000',
  });

  return true;
};

export default deployFunction;
deployFunction.id = "deploy_factory";
deployFunction.tags = ["factory"];
deployFunction.dependencies = [
  "dummy_tcro",
  "dummy_witnet",
  "hasher",
  "verifier",
];
