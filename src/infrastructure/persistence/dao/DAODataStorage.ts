// src/infrastructure/persistence/dao/DAODataStorage.ts
import { promises as fs } from 'fs';
import path from 'path';
import { createLogger } from '../../logging/logger';
import { StorageError } from '../../../core/errors';
import { 
  Transaction,
  TokenTransfer,
  EventLog,
  DAOContractMetadata 
} from '../../../core/entities';

const logger = createLogger('DAODataStorage');

interface StorageConfig {
  baseDir: string;
  prettifyJSON: boolean;
  createBackups: boolean;
}

export class DAODataStorage {
  constructor(private readonly config: StorageConfig) {}

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new StorageError(
        `Failed to create directory: ${dirPath}`,
        undefined,
        error
      );
    }
  }

  private async writeJSONSafely(filePath: string, data: any): Promise<void> {
    const tempPath = `${filePath}.tmp`;
    const backupPath = `${filePath}.backup`;

    try {
      const content = JSON.stringify(
        data,
        null,
        this.config.prettifyJSON ? 2 : 0
      );

      // Write to temporary file first
      await fs.writeFile(tempPath, content, 'utf-8');

      // Create backup of existing file if enabled
      if (this.config.createBackups) {
        try {
          await fs.copyFile(filePath, backupPath);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
      }

      // Rename temporary file to actual file
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Cleanup temporary file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {}

      throw new StorageError(
        `Failed to write file: ${filePath}`,
        undefined,
        error
      );
    }
  }

  async saveDAOData(
    daoName: string,
    contractAddress: string,
    contractType: string,
    data: {
      transactions?: Transaction[];
      events?: EventLog[];
      transfers?: TokenTransfer[];
      state?: any;
    }
  ): Promise<void> {
    const daoPath = this.getDAOPath(daoName);
    const contractPath = path.join(daoPath, 'contracts', contractAddress);

    await this.ensureDirectoryExists(contractPath);

    const saveTasks: Promise<void>[] = [];

    if (data.transactions?.length) {
      const txPath = path.join(contractPath, 'transactions');
      await this.ensureDirectoryExists(txPath);
      
      // Split transactions by type
      const normalTx = data.transactions.filter(tx => !tx.isInternal);
      const internalTx = data.transactions.filter(tx => tx.isInternal);

      if (normalTx.length) {
        saveTasks.push(
          this.writeJSONSafely(
            path.join(txPath, 'normal.json'),
            this.formatTransactions(normalTx)
          )
        );
      }

      if (internalTx.length) {
        saveTasks.push(
          this.writeJSONSafely(
            path.join(txPath, 'internal.json'),
            this.formatTransactions(internalTx)
          )
        );
      }
    }

    if (data.events?.length) {
      const eventsPath = path.join(contractPath, 'events');
      await this.ensureDirectoryExists(eventsPath);

      // Group events by type
      const eventsByType = this.groupEventsByType(data.events);
      
      for (const [eventType, events] of Object.entries(eventsByType)) {
        saveTasks.push(
          this.writeJSONSafely(
            path.join(eventsPath, `${eventType}.json`),
            events
          )
        );
      }
    }

    if (data.transfers?.length) {
      const transfersPath = path.join(contractPath, 'transfers');
      await this.ensureDirectoryExists(transfersPath);
      
      saveTasks.push(
        this.writeJSONSafely(
          path.join(transfersPath, 'token_transfers.json'),
          this.formatTransfers(data.transfers)
        )
      );
    }

    if (data.state) {
      saveTasks.push(
        this.writeJSONSafely(
          path.join(contractPath, 'state.json'),
          {
            ...data.state,
            lastUpdated: new Date().toISOString()
          }
        )
      );
    }

    await Promise.all(saveTasks);
    logger.info(`Saved data for DAO ${daoName}, contract ${contractAddress}`);
  }

  async updateDAOMetadata(
    daoName: string,
    metadata: {
      contracts: DAOContractMetadata[];
      description?: string;
      startBlock?: number;
      network?: string;
      [key: string]: any;
    }
  ): Promise<void> {
    const daoPath = this.getDAOPath(daoName);
    await this.ensureDirectoryExists(daoPath);

    await this.writeJSONSafely(
      path.join(daoPath, 'metadata.json'),
      {
        name: daoName,
        ...metadata,
        lastUpdated: new Date().toISOString()
      }
    );
  }

  private getDAOPath(daoName: string): string {
    return path.join(this.config.baseDir, 'organizations', daoName);
  }

  private formatTransactions(transactions: Transaction[]): any[] {
    return transactions.map(tx => ({
      hash: tx.hash,
      blockNumber: tx.blockNumber,
      timestamp: tx.timestamp,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed,
      input: tx.input,
      status: tx.status
    }));
  }

  private formatTransfers(transfers: TokenTransfer[]): any[] {
    return transfers.map(transfer => ({
      hash: transfer.hash,
      blockNumber: transfer.blockNumber,
      timestamp: transfer.timestamp,
      from: transfer.from,
      to: transfer.to,
      value: transfer.value,
      tokenAddress: transfer.tokenAddress,
      tokenSymbol: transfer.tokenSymbol,
      tokenDecimals: transfer.tokenDecimals
    }));
  }

  private groupEventsByType(events: EventLog[]): Record<string, any[]> {
    const eventGroups: Record<string, any[]> = {};

    for (const event of events) {
      const eventType = event.eventName || 'unknown';
      if (!eventGroups[eventType]) {
        eventGroups[eventType] = [];
      }

      eventGroups[eventType].push({
        address: event.address,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
        timestamp: event.timeStamp,
        args: event.args,
        data: event.data
      });
    }

    return eventGroups;
  }
}