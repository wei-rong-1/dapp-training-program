import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

dotenv.config();

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      gas: 3_000_000_000,
      blockGasLimit: 3_000_000_000,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    testnet: {
      url: `https://cronos-testnet-3.crypto.org:8545/`,
      chainId: 338,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
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

};

export default config;
