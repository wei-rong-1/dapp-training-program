import * as dotenv from "dotenv";
import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
// import "hardhat-deploy-ethers";

task('hasher', 'Compile Poseidon hasher').setAction(async () => {
  require('./scripts/compileHasher.ts')
});

dotenv.config();

let accounts;
if (process.env.PRIVATE_KEY) {
  accounts = [ process.env.PRIVATE_KEY ];
}

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      saveDeployments: false,
      tags: ["hardhat"],
      // forking: {
      //   url: "https://rpc.vvs.finance",
      //   blockNumber: 3961075,
      // }
    },
    localhost: {
      saveDeployments: true,
      tags: ["devnet"],
      url: "http://127.0.0.1:8545",
    },
    testnet: {
      saveDeployments: true,
      url: `https://cronos-testnet-3.crypto.org:8545/`,
      tags: ["testnet"],
      chainId: 338,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    mainnet: {
      saveDeployments: true,
      url: `https://evm.cronos.org`,
      tags: ["mainnet"],
      chainId: 25,
      accounts,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.13",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100,
          },
        },
      },
    ],
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
};

export default config;
