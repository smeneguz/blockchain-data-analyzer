// src/infrastructure/api/etherscan/EtherscanClient.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { IBlockchainDataProvider, QueryOptions } from '../../../core/interfaces';
import { Transaction, TokenTransfer } from '../../../core/entities';
import { createLogger } from '../../logging/logger';

const logger = createLogger('EtherscanClient');

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

export class EtherscanClient implements IBlockchainDataProvider {
  private readonly client: AxiosInstance;
  private lastRequestTime: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 250; // 4 requests per second max
  private readonly DEFAULT_RECORDS_PER_PAGE = 100;
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000;

  constructor(
    private readonly apiKey: string,
    private readonly network: string = 'mainnet'
  ) {
    if (!apiKey) {
      throw new Error('Etherscan API key is required');
    }

    this.client = axios.create({
      baseURL: this.getBaseUrl(),
      timeout: 60000, // 60 seconds
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
    switch (this.network.toLowerCase()) {
      case 'mainnet':
        return 'https://api.etherscan.io/api';
      case 'goerli':
        return 'https://api-goerli.etherscan.io/api';
      case 'sepolia':
        return 'https://api-sepolia.etherscan.io/api';
      case 'polygon':
        return 'https://api.polygonscan.com/api';
      default:
        throw new Error(`Unsupported network: ${this.network}`);
    }
  }

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => 
        setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }

  private async makeRequest<T>(params: Record<string, string>, retryCount = 0): Promise<T> {
    await this.throttleRequest();
    
    try {
      logger.debug('Making request with params:', { ...params, apikey: '***' });

      const response = await this.client.get('', {
        params: {
          ...params,
          apikey: this.apiKey,
        },
      });

      if (response.data.status === '0') {
        const errorMessage = response.data.message || response.data.result;
        
        if (errorMessage.includes('No transactions found')) {
          return [] as unknown as T;
        }

        if (errorMessage === 'NOTOK' || errorMessage.includes('Max rate limit reached')) {
          if (retryCount < this.MAX_RETRIES) {
            const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
            logger.warn(`Rate limit reached, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.makeRequest<T>(params, retryCount + 1);
          }
        }

        throw new EtherscanError(errorMessage, response.data.status, response.data);
      }

      return response.data.result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const isConnectionError = error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';
        
        if (isConnectionError && retryCount < this.MAX_RETRIES) {
          const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
          logger.warn(`Connection error, retrying in ${delay}ms...`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.makeRequest<T>(params, retryCount + 1);
        }

        logger.error('Network error:', {
          code: error.code,
          message: error.message,
          config: {
            url: error.config?.url,
            params: error.config?.params
          }
        });
        
        throw new EtherscanError(
          `Network error: ${error.message}`,
          error.code,
          error.response?.data
        );
      }

      if (error instanceof EtherscanError) {
        throw error;
      }

      throw new EtherscanError('Failed to fetch data from Etherscan', undefined, error);
    }
  }

  async getTransactions(
    address: string,
    options: QueryOptions = {}
  ): Promise<Transaction[]> {
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

    try {
      logger.debug(`Fetching internal transactions for address ${address}`, { 
        startBlock: options.startBlock,
        endBlock: options.endBlock,
        page: options.page
      });

      return await this.makeRequest<Transaction[]>(params);
    } catch (error) {
      logger.error(`Failed to get internal transactions for address ${address}`, error);
      throw error;
    }
  }

  async getTokenTransfers(
    address: string,
    options: QueryOptions = {}
  ): Promise<TokenTransfer[]> {
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

    try {
      logger.debug(`Fetching token transfers for address ${address}`, { 
        startBlock: options.startBlock,
        endBlock: options.endBlock,
        page: options.page
      });

      return await this.makeRequest<TokenTransfer[]>(params);
    } catch (error) {
      logger.error(`Failed to get token transfers for address ${address}`, error);
      throw error;
    }
  }

  async getBalance(address: string): Promise<string> {
    const params = {
      module: 'account',
      action: 'balance',
      address,
      tag: 'latest',
    };

    try {
      logger.debug(`Fetching balance for address ${address}`);
      return await this.makeRequest<string>(params);
    } catch (error) {
      logger.error(`Failed to get balance for address ${address}`, error);
      throw error;
    }
  }
}