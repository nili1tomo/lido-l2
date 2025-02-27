import * as dotenv from "dotenv";

import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

import "./tasks/fork-node";
import env from "./utils/env";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.6.11",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100,
          },
        },
      },
      {
        version: "0.8.10",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100_000,
          },
        },
      },
    ],
  },
  networks: {
    // Ethereum Public Chains
    eth_mainnet: {
      url: env.string("RPC_ETH_MAINNET", ""),
    },
    eth_goerli: {
      url: env.string("RPC_ETH_GOERLI", ""),
    },

    // Ethereum Fork Chains
    eth_mainnet_fork: {
      url: "http://localhost:8545",
    },
    eth_goerli_fork: {
      url: "http://localhost:8545",
    },

    // Arbitrum Public Chains
    arb_mainnet: {
      url: env.string("RPC_ARB_MAINNET", ""),
    },
    arb_goerli: {
      url: env.string("RPC_ARB_GOERLI", ""),
    },

    // Arbitrum Fork Chains
    arb_mainnet_fork: {
      url: "http://localhost:8546",
    },
    arb_goerli_fork: {
      url: "http://localhost:8546",
    },

    // Optimism Public Chains
    opt_mainnet: {
      url: env.string("RPC_OPT_MAINNET", ""),
    },
    opt_goerli: {
      url: env.string("RPC_OPT_GOERLI", ""),
    },

    // Optimism Fork Chains
    opt_mainnet_fork: {
      url: "http://localhost:9545",
    },
    opt_goerli_fork: {
      url: "http://localhost:9545",
    },
    // Mantle Public Chains
    mnt_mainnet: {
      url: env.string("RPC_MNT_MAINNET", ""),
    },
    mnt_goerli: {
      url: env.string("RPC_MNT_GOERLI", ""),
    },

    // Mantle Fork Chains
    mnt_mainnet_fork: {
      url: "http://localhost:9545",
    },
    mnt_goerli_fork: {
      url: "http://localhost:9545",

    },
  },
  gasReporter: {
    enabled: env.string("REPORT_GAS", "false") !== "false",
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      mainnet: env.string("ETHERSCAN_API_KEY_ETH", ""),
      goerli: env.string("ETHERSCAN_API_KEY_ETH", ""),
      arbitrumGoerli: env.string("ETHERSCAN_API_KEY_ARB", ""),
      arbitrumOne: env.string("ETHERSCAN_API_KEY_ARB", ""),
      optimisticEthereum: env.string("ETHERSCAN_API_KEY_OPT", ""),
      mnt_goerli: env.string("ETHERSCAN_API_KEY_MNT", ""),
      mnt_mainnet: env.string("ETHERSCAN_API_KEY_MNT", ""),
      },
      customChains: [
      {
        network: "mnt_mainnet",
        chainId: 5000,
        urls: {
          apiURL: "https://explorer.mantle.xyz/api",
          browserURL: "https://explorer.mantle.xyz/api?module=contract&action=verify"
        }
      }
    ]
  },
  typechain: {
    externalArtifacts: [
      "./interfaces/**/*.json",
      "./utils/optimism/artifacts/*.json",
      "./utils/mantle/artifacts/*.json",
      "./utils/arbitrum/artifacts/*.json",
    ],
  },
  mocha: {
    timeout: 20 * 60 * 60 * 1000, // 20 minutes for e2e tests
  },
};

export default config;
