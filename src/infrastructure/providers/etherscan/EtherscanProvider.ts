// src/infrastructure/providers/etherscan/EtherscanProvider.ts
import axios, { AxiosInstance } from 'axios';
import { BaseProvider } from '../base/BaseProvider';
import { Transaction, TokenTransfer } from '../../../core/entities';
import { QueryOptions } from '../../../core/interfaces';
import { createLogger } from '../../logging/logger';
import { EventLog, EventFilter, ProviderConfig } from '../types';

const logger = createLogger('EtherscanProvider');

export class EtherscanError extends Error {
    constructor(
        message: string,
        public code?: string,
        public details?: unknown
    ) {
        super(message);
        this.name = 'EtherscanError';
        Error.captureStackTrace(this, this.constructor);
    }
}

export class EtherscanProvider extends BaseProvider {
    private readonly client: AxiosInstance;
    private readonly DEFAULT_RECORDS_PER_PAGE = 100;

    constructor(config: ProviderConfig) {
        super(config);

        if (!config.apiKey) {
            throw new Error('Etherscan API key is required');
        }

        this.client = axios.create({
            baseURL: this.getBaseUrl(),
            timeout: this.timeout,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'blockchain-data-analyzer'
            },
            validateStatus: status => status >= 200 && status < 300,
            maxRedirects: 5,
            decompress: true,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
    }

    private getBaseUrl(): string {
        switch (this.config.network.name.toLowerCase()) {
            case 'mainnet':
                return 'https://api.etherscan.io/api';
            case 'goerli':
                return 'https://api-goerli.etherscan.io/api';
            case 'sepolia':
                return 'https://api-sepolia.etherscan.io/api';
            case 'polygon':
                return 'https://api.polygonscan.com/api';
            default:
                throw new Error(`Unsupported network: ${this.config.network.name}`);
        }
    }

    private async makeRequest<T>(params: Record<string, string>): Promise<T> {
        return this.withRetry(async () => {
            logger.debug('Making request with params:', { ...params, apikey: '***' });

            const response = await this.client.get('', {
                params: {
                    ...params,
                    apikey: this.config.apiKey,
                },
            });

            if (response.data.status === '0') {
                const errorMessage = response.data.message || response.data.result;
                
                if (errorMessage.includes('No transactions found')) {
                    return [] as unknown as T;
                }

                throw new EtherscanError(errorMessage, response.data.status, response.data);
            }

            return response.data.result;
        }, `EtherscanProvider.makeRequest(${params.action})`);
    }

    async getTransactions(
        address: string,
        options: QueryOptions = {}
    ): Promise<Transaction[]> {
        this.validateAddress(address);
        this.validateBlockRange(options.startBlock, options.endBlock);

        const params = {
            module: 'account',
            action: 'txlist',
            address,
            startblock: (options.startBlock || 0).toString(),
            endblock: (options.endBlock || 99999999).toString(),
            page: (options.page || 1).toString(),
            offset: (options.offset || this.DEFAULT_RECORDS_PER_PAGE).toString(),
            sort: options.sort || 'asc',
        };

        try {
            logger.debug(`Fetching transactions for address ${address}`, { 
                startBlock: options.startBlock,
                endBlock: options.endBlock,
                page: options.page
            });

            return await this.makeRequest<Transaction[]>(params);
        } catch (error) {
            logger.error(`Failed to get transactions for address ${address}`, error);
            throw error;
        }
    }

    async getInternalTransactions(
        address: string,
        options: QueryOptions = {}
    ): Promise<Transaction[]> {
        this.validateAddress(address);
        this.validateBlockRange(options.startBlock, options.endBlock);

        const params = {
            module: 'account',
            action: 'txlistinternal',
            address,
            startblock: (options.startBlock || 0).toString(),
            endblock: (options.endBlock || 99999999).toString(),
            page: (options.page || 1).toString(),
            offset: (options.offset || this.DEFAULT_RECORDS_PER_PAGE).toString(),
            sort: options.sort || 'asc',
        };

        return this.makeRequest<Transaction[]>(params);
    }

    async getTokenTransfers(
        address: string,
        options: QueryOptions = {}
    ): Promise<TokenTransfer[]> {
        this.validateAddress(address);
        this.validateBlockRange(options.startBlock, options.endBlock);

        const params = {
            module: 'account',
            action: 'tokentx',
            address,
            startblock: (options.startBlock || 0).toString(),
            endblock: (options.endBlock || 99999999).toString(),
            page: (options.page || 1).toString(),
            offset: (options.offset || this.DEFAULT_RECORDS_PER_PAGE).toString(),
            sort: options.sort || 'asc',
        };

        return this.makeRequest<TokenTransfer[]>(params);
    }

    async getEvents(filter: EventFilter): Promise<EventLog[]> {
        if (filter.address) {
            this.validateAddress(
                Array.isArray(filter.address) ? filter.address[0] : filter.address
            );
        }
        this.validateBlockRange(filter.fromBlock, filter.toBlock);

        const params = {
            module: 'logs',
            action: 'getLogs',
            address: Array.isArray(filter.address) ? filter.address.join(',') : filter.address,
            fromBlock: (filter.fromBlock || 0).toString(),
            toBlock: (filter.toBlock || 'latest').toString(),
            topics: filter.topics?.map(topic => 
                Array.isArray(topic) ? topic.join(',') : topic
            ).filter(Boolean).join(',')
        };

        return this.makeRequest<EventLog[]>(params);
    }

    async getContractEvents(
        address: string,
        eventSignature: string,
        fromBlock: number | string,
        toBlock: number | string
    ): Promise<EventLog[]> {
        return this.getEvents({
            address,
            topics: [eventSignature],
            fromBlock,
            toBlock
        });
    }

    async getBalance(address: string): Promise<string> {
        this.validateAddress(address);

        const params = {
            module: 'account',
            action: 'balance',
            address,
            tag: 'latest',
        };

        return this.makeRequest<string>(params);
    }

    async getCurrentBlock(): Promise<number> {
        const params = {
            module: 'proxy',
            action: 'eth_blockNumber'
        };

        const result = await this.makeRequest<string>(params);
        return parseInt(result, 16);
    }
}