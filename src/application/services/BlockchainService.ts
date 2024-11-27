// src/application/services/BlockchainService.ts
import { IBlockchainDataProvider } from '../../core/interfaces/IBlockchainDataProvider';
import { IDataStorage } from '../../core/interfaces/IDataStorage';
import { Organization, Transaction, TokenTransfer } from '../../core/entities';
import { createLogger } from '../../infrastructure/logging/logger';
import { EtherscanError } from '../../infrastructure/api/etherscan/EtherscanClient';
import { StorageState } from '../../infrastructure/persistence/FileSystemStorage';
import { ethers } from 'ethers';

const logger = createLogger('BlockchainService');

export interface DataCollectionOptions {
  startBlock?: number;
  endBlock?: number;
  includeTokenTransfers?: boolean;
  includeInternalTransactions?: boolean;
  resume?: boolean;
}

export class BlockchainService {
  private readonly MAX_RECORDS_PER_CALL = 100;
  private readonly BLOCK_RANGE = 50000;
  private readonly DELAY_BETWEEN_CALLS = 250;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 10000;

  constructor(
    private readonly dataProvider: IBlockchainDataProvider,
    private readonly storage: IDataStorage
  ) {}

  private async delay(ms: number = this.DELAY_BETWEEN_CALLS): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    description: string
  ): Promise<T> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const isLastAttempt = attempt === this.MAX_RETRIES;
        const shouldRetry = !isLastAttempt && (
          !(error instanceof EtherscanError) ||
          error.message.includes('timeout') ||
          error.message.includes('rate limit')
        );

        if (shouldRetry) {
          const delayTime = this.RETRY_DELAY * attempt;
          logger.warn(`${description} failed (attempt ${attempt}/${this.MAX_RETRIES}), retrying in ${delayTime/1000}s...`, error);
          await this.delay(delayTime);
          continue;
        }
        throw error;
      }
    }
    throw new Error(`Failed after ${this.MAX_RETRIES} attempts: ${description}`);
  }

  private async processBatchWithType<T extends Transaction | TokenTransfer>(
    fetchFn: (start: number, end: number, page: number) => Promise<T[]>,
    saveFn: (items: T[]) => Promise<void>,
    startBlock: number,
    endBlock: number,
    name: string,
    description: string,
    state: StorageState | null
  ): Promise<void> {
    let totalProcessed = 0;
    let currentStart = startBlock;

    while (currentStart <= endBlock) {
      const currentEnd = Math.min(currentStart + this.BLOCK_RANGE - 1, endBlock);
      let page = 1;
      let hasMoreData = true;

      logger.info(`Processing ${description} for blocks ${currentStart} to ${currentEnd}`);

      try {
        while (hasMoreData) {
          const items = await this.retryOperation(
            () => fetchFn(currentStart, currentEnd, page),
            `Fetching ${description} page ${page} for blocks ${currentStart}-${currentEnd}`
          );

          if (!items || items.length === 0) {
            hasMoreData = false;
            continue;
          }

          await saveFn(items);
          totalProcessed += items.length;
          logger.info(`Saved ${items.length} ${description} (Total: ${totalProcessed}, Blocks: ${currentStart}-${currentEnd}, Page: ${page})`);

          if (items.length < this.MAX_RECORDS_PER_CALL) {
            hasMoreData = false;
          } else {
            page++;
            await this.delay();
          }
        }
      } catch (error) {
        if (error instanceof EtherscanError) {
          if (error.message.includes('No transactions found')) {
            logger.info(`No ${description} found in blocks ${currentStart}-${currentEnd}`);
          } else if (error.message.includes('Max rate limit reached')) {
            logger.warn('Rate limit reached, waiting before retry...');
            await this.delay(5000);
            continue;
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      currentStart = currentEnd + 1;
    }

    logger.info(`Completed processing ${description}. Total items: ${totalProcessed}`);
  }

  async analyzeOrganization(
    address: string,
    name: string,
    options: DataCollectionOptions = {}
  ): Promise<void> {
    try {
      logger.info(`Starting analysis for organization: ${name} (${address})`);

      let state: StorageState | null = null;
      if (options.resume) {
        state = await this.storage.getLastProcessedState(name);
        if (state) {
          logger.info('Resuming from previous state:', {
            lastBlock: state.lastProcessedBlock,
            totalTransactions: state.totalTransactions,
            lastProcessed: state.lastProcessedTimestamp
          });
        }
      }

      const organization: Organization = {
        address,
        name,
        chainId: 1,
        dateAdded: new Date().toISOString(),
      };

      await this.storage.saveOrganization(organization);

      const endBlock = options.endBlock || await this.getCurrentBlock();

      // Process normal transactions
      const normalStartBlock = options.resume && state?.transactionTypes.normal.lastBlock ?
        state.transactionTypes.normal.lastBlock + 1 :
        (options.startBlock || 0);

      await this.processBatchWithType<Transaction>(
        (start, end, page) => this.dataProvider.getTransactions(address, {
          startBlock: start,
          endBlock: end,
          page,
          offset: this.MAX_RECORDS_PER_CALL,
          sort: 'asc'
        }),
        (items) => this.storage.saveTransactions(name, items, 'normal'),
        normalStartBlock,
        endBlock,
        name,
        'normal transactions',
        state
      );

      if (options.includeInternalTransactions) {
        const internalStartBlock = options.resume && state?.transactionTypes.internal.lastBlock ?
          state.transactionTypes.internal.lastBlock + 1 :
          (options.startBlock || 0);

        await this.processBatchWithType<Transaction>(
          (start, end, page) => this.dataProvider.getInternalTransactions(address, {
            startBlock: start,
            endBlock: end,
            page,
            offset: this.MAX_RECORDS_PER_CALL,
            sort: 'asc'
          }),
          (items) => this.storage.saveTransactions(name, items, 'internal'),
          internalStartBlock,
          endBlock,
          name,
          'internal transactions',
          state
        );
      }

      if (options.includeTokenTransfers) {
        const tokenStartBlock = options.resume && state?.transactionTypes.tokenTransfers.lastBlock ?
          state.transactionTypes.tokenTransfers.lastBlock + 1 :
          (options.startBlock || 0);

        await this.processBatchWithType<TokenTransfer>(
          (start, end, page) => this.dataProvider.getTokenTransfers(address, {
            startBlock: start,
            endBlock: end,
            page,
            offset: this.MAX_RECORDS_PER_CALL,
            sort: 'asc'
          }),
          (items) => this.storage.saveTokenTransfers(name, items),
          tokenStartBlock,
          endBlock,
          name,
          'token transfers',
          state
        );
      }

      logger.info(`Completed analysis for organization: ${name}`);
    } catch (error) {
      logger.error(`Failed to analyze organization: ${name}`, error);
      throw error;
    }
  }

  private async getCurrentBlock(): Promise<number> {
    try {
      const provider = new ethers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/demo');
      const blockNumber = await provider.getBlockNumber();
      return blockNumber;
    } catch (error) {
      logger.error('Failed to get current block number, using default', error);
      return 18000000;
    }
  }
}