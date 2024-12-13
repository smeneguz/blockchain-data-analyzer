// src/infrastructure/providers/types.ts
import { Transaction, TokenTransfer } from '../../core/entities';

export interface NetworkConfig {
    name: string;
    chainId: number;
    rpcUrl?: string;
}

export interface ProviderConfig {
    apiKey: string;
    network: NetworkConfig;
    maxRetries?: number;
    timeout?: number;
    rateLimit?: {
        requestsPerSecond: number;
        timeWindow: number;
    };
}

export interface EventLogTopic {
    name: string;
    type: string;
    indexed: boolean;
}

export interface EventLog {
    address: string;
    topics: string[];
    data: string;
    blockNumber: string;
    timeStamp: string;
    gasPrice: string;
    gasUsed: string;
    logIndex: string;
    transactionHash: string;
    transactionIndex: string;
    removed?: boolean;
}

export interface EventFilter {
    address?: string;
    topics?: (string | string[] | null)[];
    fromBlock?: number | string;
    toBlock?: number | string;
  }

export interface BlockRange {
    fromBlock: number | string;
    toBlock: number | string;
}

export interface ContractEvent {
    name: string;
    signature: string;
    topics: EventLogTopic[];
}

export interface ProviderError extends Error {
    code?: string;
    details?: unknown;
}