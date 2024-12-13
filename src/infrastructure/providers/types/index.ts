// src/infrastructure/providers/types/index.ts
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
    removed: boolean;
    args?: any;  // For decoded event arguments
}

export interface EventFilter {
    address?: string;
    topics?: (string | string[])[];
    fromBlock?: number | string;
    toBlock?: number | string;
}

export interface ProviderConfig {
    apiKey?: string;
    network: {
        name: string;
        chainId?: number;
    };
}