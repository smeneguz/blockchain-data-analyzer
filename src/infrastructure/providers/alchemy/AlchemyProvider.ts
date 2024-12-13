import { Alchemy, Network } from 'alchemy-sdk';
import { BaseProvider } from '../base/BaseProvider';
import { Transaction, TokenTransfer } from '../../../core/entities';
import { QueryOptions } from '../../../core/interfaces';
import { createLogger } from '../../logging/logger';
import { EventLog, EventFilter, ProviderConfig } from '../types';
import { 
  keccak256,
  toUtf8Bytes,
  AbiCoder
} from 'ethers';

const logger = createLogger('AlchemyProvider');

interface AlchemyLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  logIndex: number;
  transactionIndex: number;
  transactionHash: string;
  removed?: boolean;
}


export class AlchemyProvider extends BaseProvider {
  private readonly alchemy: Alchemy;

  constructor(config: ProviderConfig) {
    super(config);

    if (!config.apiKey) {
      throw new Error('Alchemy API key is required');
    }

    this.alchemy = new Alchemy({
      apiKey: config.apiKey,
      network: this.getNetwork(config.network.name)
    });
  }

  private getNetwork(networkName: string): Network {
    const networks: Record<string, Network> = {
      mainnet: Network.ETH_MAINNET,
      goerli: Network.ETH_GOERLI,
      sepolia: Network.ETH_SEPOLIA
    };

    const network = networks[networkName.toLowerCase()];
    if (!network) {
      throw new Error(`Unsupported network: ${networkName}`);
    }

    return network;
  }

  async getEvents(filter: EventFilter): Promise<EventLog[]> {
    return this.withRetry(async () => {
      const logs = await this.alchemy.core.getLogs({
        address: filter.address,
        topics: filter.topics as string[][],
        fromBlock: this.formatBlockParam(filter.fromBlock),
        toBlock: this.formatBlockParam(filter.toBlock)
      });

      return logs.map(log => this.formatEventLog({
        ...log,
        blockNumber: log.blockNumber.toString(),
        logIndex: log.logIndex.toString(),
        transactionIndex: log.transactionIndex.toString()
      }));
    }, 'getEvents');
  }


  async getAllContractEvents(
    address: string,
    fromBlock: number | string,
    toBlock: number | string
  ): Promise<EventLog[]> {
    return this.getEvents({
      address,
      fromBlock,
      toBlock
    });
  }

  async getContractEvents(
    address: string,
    eventSignature: string,
    fromBlock: number | string,
    toBlock: number | string
  ): Promise<EventLog[]> {
    const eventId = keccak256(
      toUtf8Bytes(eventSignature)
    );

    return this.getEvents({
      address,
      topics: [eventId],
      fromBlock,
      toBlock
    });
  }

  private formatEventLog(log: any): EventLog {
    return {
        address: log.address,
        topics: log.topics,
        data: log.data,
        blockNumber: log.blockNumber,
        timeStamp: log.timeStamp || '',
        gasPrice: log.gasPrice || '',
        gasUsed: log.gasUsed || '',
        logIndex: log.logIndex,
        transactionHash: log.transactionHash,
        transactionIndex: log.transactionIndex,
        removed: log.removed || false,
        args: log.args || {}
    };
}

  private formatBlockParam(block?: number | string): string {
    if (!block) return 'latest';
    if (typeof block === 'number') return `0x${block.toString(16)}`;
    return block;
  }

  async getTransactions(address: string, options?: QueryOptions): Promise<Transaction[]> {
    logger.info('getTransactions not implemented in AlchemyProvider');
    return [];
  }

  async getInternalTransactions(address: string, options?: QueryOptions): Promise<Transaction[]> {
    logger.info('getInternalTransactions not implemented in AlchemyProvider');
    return [];
  }

  async getTokenTransfers(address: string, options?: QueryOptions): Promise<TokenTransfer[]> {
    logger.info('getTokenTransfers not implemented in AlchemyProvider');
    return [];
  }

  async getBalance(address: string): Promise<string> {
    const balance = await this.alchemy.core.getBalance(address);
    return balance.toString();
  }

  async getCurrentBlock(): Promise<number> {
    const blockNumber = await this.alchemy.core.getBlockNumber();
    return blockNumber;
  }
}