// import WalletConnectProvider from "@walletconnect/web3-provider";
import Web3Modal from "web3modal";
// import { INFURA_ID } from "../constants";

/**
  Web3 modal helps us "connect" external wallets:
**/
const web3ModalSetup = () =>
  new Web3Modal({
    network: "mainnet", // Optional. If using WalletConnect on xDai, change network to "xdai" and add RPC info below for xDai chain.
    cacheProvider: true, // optional
    theme: "light", // optional. Change to "dark" for a dark theme.
    providerOptions: {
      // walletconnect: {
      //   package: WalletConnectProvider, // required
      //   options: {
      //     bridge: "https://polygon.bridge.walletconnect.org",
      //     infuraId: INFURA_ID,
      //     rpc: {
      //       338: "https://cronos-testnet-3.crypto.org:8545/",
      //       25: "https://evm.cronos.org",
      //     },
      //   },
      // },
    },
  });

export default web3ModalSetup;
