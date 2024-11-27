import { Transaction, TokenTransfer } from '../entities';

export interface QueryOptions {
    startBlock?: number;
    endBlock?: number;
    page?: number;
    offset?: number;
    sort?: 'asc' | 'desc';
}

export interface IBlockchainDataProvider {
    getTransactions(address: string, options?: QueryOptions): Promise<Transaction[]>;
    getInternalTransactions(address: string, options?: QueryOptions): Promise<Transaction[]>;
    getTokenTransfers(address: string, options?: QueryOptions): Promise<TokenTransfer[]>;
    getBalance(address: string): Promise<string>;
}