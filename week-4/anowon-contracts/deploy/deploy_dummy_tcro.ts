import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployFunction: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { getNamedAccounts, deployments } = hre;
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;

  await deploy("DummyTCRO", {
    from: deployer,
    log: true,
  });

  return true;
};

export default deployFunction;
deployFunction.id = "deploy_dummy_tcro";
deployFunction.tags = ["dummy_tcro"];
