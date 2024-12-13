// src/core/types/index.ts
export interface EventLog {
    address: string;
    topics: string[];
    data: string;
    blockNumber: string;
    timeStamp?: string;
    gasPrice?: string;
    gasUsed?: string;
    logIndex: string;
    transactionHash: string;
    transactionIndex: string;
    blockHash?: string;
    removed?: boolean;
    eventName?: string;
    args?: Record<string, any>;
  }
  
  export interface EventFilter {
    address?: string;
    topics?: (string | string[] | null)[];
    fromBlock?: number | string;
    toBlock?: number | string;
  }