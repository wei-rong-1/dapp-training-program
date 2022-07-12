import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.9",

  networks: {
    hardhat: {
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
};

export default config;
