import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployFunction: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { getNamedAccounts, deployments } = hre;
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;

  await deploy("DummyWitnet", {
    from: deployer,
    log: true,
  });

  return true;
};

export default deployFunction;
deployFunction.id = "deploy_dummy_witnet";
deployFunction.tags = ["dummy_witnet"];
