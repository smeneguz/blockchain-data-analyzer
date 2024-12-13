// src/config/daos/template.config.ts
import { DAOConfig } from '../../core/interfaces/IDAOProvider';

/**
 * Flexible DAO Configuration Template
 * This template supports various DAO structures and governance models
 */
export interface ExtendedDAOConfig extends DAOConfig {
  // Core DAO Information
  name: string;
  description: string;
  network: string;
  deploymentDate?: string;
  website?: string;
  documentation?: string;

  // Governance Structure
  governanceModel?: {
    type: 'single-token' | 'multi-token' | 'nft-based' | 'reputation-based' | 'custom';
    description: string;
    votingDelay?: number;
    votingPeriod?: number;
    proposalThreshold?: string;
  };

  // Contract Definitions
  contracts: {
    // Core Contracts (required)
    governance: {
      address: string;
      type: 'governor';
      name: string;
      startBlock: number;
      implementation?: string;
      proxy?: {
        address: string;
        admin?: string;
      };
      abi?: string; // Path to ABI file or API endpoint
    }[];

    // Token Contracts
    tokens: {
      address: string;
      type: 'token';
      name: string;
      startBlock: number;
      tokenType: 'ERC20' | 'ERC721' | 'ERC1155' | 'custom';
      isGovernance: boolean;
      metadata?: {
        symbol: string;
        decimals: number;
      };
    }[];

    // Treasury Contracts
    treasury?: {
      address: string;
      type: 'treasury';
      name: string;
      startBlock: number;
      controllers?: string[];
    }[];

    // Additional Contracts (optional)
    auxiliary?: {
      address: string;
      type: string;
      name: string;
      startBlock: number;
      description: string;
      purpose: string;
    }[];
  };

  // Event Tracking Configuration
  eventTracking?: {
    customEvents?: {
      contract: string;
      eventName: string;
      description: string;
      startBlock?: number;
    }[];
    filters?: {
      fromBlock?: number;
      toBlock?: number;
      eventTypes?: string[];
    };
  };

  // Data Collection Preferences
  dataCollection?: {
    includeInternalTransactions?: boolean;
    includeTokenTransfers?: boolean;
    includeStateSnapshots?: boolean;
    snapshotInterval?: number;
    customMetrics?: string[];
  };

  // Update Information
  lastUpdated?: string;
  updateFrequency?: 'realtime' | 'daily' | 'weekly';
}

/**
 * Example usage - can be customized based on DAO structure
 */
export const ExampleDAOConfig: ExtendedDAOConfig = {
  name: 'Example DAO',
  description: 'Description of the DAO',
  network: 'mainnet',
  deploymentDate: '2023-01-01',
  
  governanceModel: {
    type: 'single-token',
    description: 'Token-based governance with single token voting',
    votingDelay: 7200, // blocks
    votingPeriod: 14400 // blocks
  },

  contracts: {
    governance: [{
      address: '0x...',
      type: 'governor',
      name: 'Main Governor',
      startBlock: 1000000,
      implementation: '0x...',
      proxy: {
        address: '0x...',
        admin: '0x...'
      }
    }],

    tokens: [{
      address: '0x...',
      type: 'token',
      name: 'Governance Token',
      startBlock: 1000000,
      tokenType: 'ERC20',
      isGovernance: true,
      metadata: {
        symbol: 'GOV',
        decimals: 18
      }
    }],

    treasury: [{
      address: '0x...',
      type: 'treasury',
      name: 'Main Treasury',
      startBlock: 1000000,
      controllers: ['0x...']
    }]
  },

  eventTracking: {
    customEvents: [{
      contract: '0x...',
      eventName: 'CustomEvent',
      description: 'Description of the custom event'
    }]
  },

  dataCollection: {
    includeInternalTransactions: true,
    includeTokenTransfers: true,
    includeStateSnapshots: true,
    snapshotInterval: 100000
  }
};