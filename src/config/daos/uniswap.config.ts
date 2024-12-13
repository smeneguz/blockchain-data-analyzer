// src/config/daos/uniswap.config.ts
import { ExtendedDAOConfig } from './template.config';

export const UniswapConfig: ExtendedDAOConfig = {
  name: 'Uniswap',
  description: 'Uniswap DAO - Decentralized Protocol Governance',
  network: 'mainnet',
  deploymentDate: '2020-09-16',
  website: 'https://uniswap.org',
  documentation: 'https://docs.uniswap.org/protocol/governance',

  governanceModel: {
    type: 'single-token',
    description: 'Token-based governance with UNI token',
    votingDelay: 7200,
    votingPeriod: 14400
  },

  contracts: {
    governance: [{
      address: '0x1a9C8182C09F50C8318d769245beA52c32BE35BC',
      type: 'governor',
      name: 'Uniswap Governor Bravo',
      startBlock: 12865000
    }],

    tokens: [{
      address: '0x1F9840a85d5aF5bf1D1762F925BDADdC4201F984',
      type: 'token',
      name: 'UNI Token',
      startBlock: 10861674,
      tokenType: 'ERC20',
      isGovernance: true,
      metadata: {
        symbol: 'UNI',
        decimals: 18
      }
    }],

    treasury: [{
      address: '0x4750c43867ef5f89869132eccf19b9b6c4286e1a',
      type: 'treasury',
      name: 'Uniswap Treasury',
      startBlock: 12865000
    }]
  },

  dataCollection: {
    includeInternalTransactions: true,
    includeTokenTransfers: true,
    includeStateSnapshots: true,
    snapshotInterval: 100000
  }
};