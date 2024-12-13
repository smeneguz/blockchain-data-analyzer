// src/core/interfaces/IDataStorage.ts
import { Organization, Transaction, TokenTransfer } from '../entities';
import { EventLog } from '../types';

export interface StorageState {
  lastProcessedBlock: number;
  lastProcessedTimestamp: string;
  totalTransactions: number;
  transactionTypes: {
    normal: {
      lastBlock: number;
      count: number;
      lastProcessedTimestamp: string;
    };
    internal: {
      lastBlock: number;
      count: number;
      lastProcessedTimestamp: string;
    };
    tokenTransfers: {
      lastBlock: number;
      count: number;
      lastProcessedTimestamp: string;
    };
  };
  events?: {
    lastBlock: number;
    count: number;
    lastProcessedTimestamp: string;
    contractAddresses: Record<string, {
      lastBlock: number;
      eventCounts: Record<string, number>;
    }>;
  };
}

export interface IDataStorage {
  saveOrganization(organization: Organization): Promise<void>;
  getOrganization(address: string): Promise<Organization | null>;
  saveTransactions(organizationName: string, transactions: Transaction[], type: string): Promise<void>;
  saveTokenTransfers(organizationName: string, transfers: TokenTransfer[]): Promise<void>;
  saveContractEvents?(organizationName: string, contractAddress: string, events: EventLog[]): Promise<void>;
  getLastProcessedState(name: string): Promise<StorageState | null>;
}