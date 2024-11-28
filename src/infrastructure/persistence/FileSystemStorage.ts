// src/infrastructure/persistence/FileSystemStorage.ts
import fs from 'fs-extra';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { IDataStorage } from '../../core/interfaces/IDataStorage';
import { Organization, Transaction, TokenTransfer } from '../../core/entities';
import { createLogger } from '../logging/logger';

const logger = createLogger('FileSystemStorage');

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
}

export class FileSystemStorage implements IDataStorage {
  private readonly baseDir: string;
  private readonly organizationsDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'data');
    this.organizationsDir = path.join(this.baseDir, 'organizations');
    this.initializeStorage();
  }

  private async initializeStorage(): Promise<void> {
    try {
      await fs.ensureDir(this.baseDir);
      await fs.ensureDir(this.organizationsDir);
      logger.info('Storage system initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize storage system', error);
      throw error;
    }
  }

  private getOrganizationDir(name: string): string {
    return path.join(this.organizationsDir, this.sanitizeFileName(name));
  }

  private getStateFilePath(organizationName: string): string {
    return path.join(this.getOrganizationDir(organizationName), 'state.json');
  }

  private getTransactionsFilePath(organizationName: string, type: string): string {
    return path.join(this.getOrganizationDir(organizationName), `${type}_transactions.csv`);
  }

  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }

  async saveOrganization(organization: Organization): Promise<void> {
    try {
      const orgDir = this.getOrganizationDir(organization.name);
      await fs.ensureDir(orgDir);

      // Save organization metadata
      const metadataPath = path.join(orgDir, 'metadata.json');
      await fs.writeJSON(metadataPath, organization, { spaces: 2 });

      // Initialize state if it doesn't exist
      const statePath = this.getStateFilePath(organization.name);
      if (!await fs.pathExists(statePath)) {
        const initialState: StorageState = {
          lastProcessedBlock: 0,
          lastProcessedTimestamp: new Date().toISOString(),
          totalTransactions: 0,
          transactionTypes: {
            normal: {
              lastBlock: 0,
              count: 0,
              lastProcessedTimestamp: new Date().toISOString()
            },
            internal: {
              lastBlock: 0,
              count: 0,
              lastProcessedTimestamp: new Date().toISOString()
            },
            tokenTransfers: {
              lastBlock: 0,
              count: 0,
              lastProcessedTimestamp: new Date().toISOString()
            }
          }
        };
        await fs.writeJSON(statePath, initialState, { spaces: 2 });
      }

      logger.info(`Organization ${organization.name} saved successfully`);
    } catch (error) {
      logger.error(`Failed to save organization ${organization.name}`, error);
      throw error;
    }
  }

  async getOrganization(address: string): Promise<Organization | null> {
    try {
      // Search through all organization directories
      const orgs = await fs.readdir(this.organizationsDir);
      for (const org of orgs) {
        const metadataPath = path.join(this.organizationsDir, org, 'metadata.json');
        if (await fs.pathExists(metadataPath)) {
          const metadata = await fs.readJSON(metadataPath);
          if (metadata.address === address) {
            return metadata;
          }
        }
      }
      return null;
    } catch (error) {
      logger.error(`Failed to get organization for address ${address}`, error);
      throw error;
    }
  }

  async getLastProcessedState(name: string): Promise<StorageState | null> {
    const statePath = this.getStateFilePath(name);
    try {
      if (await fs.pathExists(statePath)) {
        return await fs.readJSON(statePath);
      }
    } catch (error) {
      logger.warn(`Failed to read state file for ${name}`, error);
    }
    return null;
  }

  private async updateState(
    name: string,
    type: keyof StorageState['transactionTypes'],
    lastBlock: number,
    addedCount: number
  ): Promise<void> {
    const statePath = this.getStateFilePath(name);
    try {
      const state = await this.getLastProcessedState(name) || {
        lastProcessedBlock: 0,
        lastProcessedTimestamp: new Date().toISOString(),
        totalTransactions: 0,
        transactionTypes: {
          normal: {
            lastBlock: 0,
            count: 0,
            lastProcessedTimestamp: new Date().toISOString()
          },
          internal: {
            lastBlock: 0,
            count: 0,
            lastProcessedTimestamp: new Date().toISOString()
          },
          tokenTransfers: {
            lastBlock: 0,
            count: 0,
            lastProcessedTimestamp: new Date().toISOString()
          }
        }
      };

      state.transactionTypes[type].lastBlock = Math.max(
        state.transactionTypes[type].lastBlock,
        lastBlock
      );
      state.transactionTypes[type].count += addedCount;
      state.transactionTypes[type].lastProcessedTimestamp = new Date().toISOString();
      
      state.totalTransactions += addedCount;
      state.lastProcessedBlock = Math.max(
        state.lastProcessedBlock,
        lastBlock
      );
      state.lastProcessedTimestamp = new Date().toISOString();

      await fs.writeJSON(statePath, state, { spaces: 2 });
    } catch (error) {
      logger.error(`Failed to update state for ${name}`, error);
      throw error;
    }
  }

  async saveTransactions(
    organizationName: string,
    transactions: Transaction[],
    type: string
): Promise<void> {
    if (transactions.length === 0) return;

    try {
        const orgDir = this.getOrganizationDir(organizationName);
        await fs.ensureDir(orgDir);
        const txDir = path.join(orgDir, 'transactions');
        await fs.ensureDir(txDir);

        const filePath = path.join(txDir, `${type}.csv`);
        const fileExists = await fs.pathExists(filePath);

        // Sort transactions by block number
        transactions.sort((a, b) => Number(a.blockNumber) - Number(b.blockNumber));

        const csvWriter = createObjectCsvWriter({
            path: filePath,
            append: fileExists,
            header: [
                { id: 'hash', title: 'Hash' },
                { id: 'blockNumber', title: 'Block Number' },
                { id: 'timeStamp', title: 'Timestamp' },
                { id: 'from', title: 'From' },
                { id: 'to', title: 'To' },
                { id: 'value', title: 'Value' },
                { id: 'gas', title: 'Gas' },
                { id: 'gasPrice', title: 'Gas Price' },
                { id: 'isError', title: 'Is Error' },
                { id: 'txreceipt_status', title: 'Receipt Status' },
                { id: 'input', title: 'Input Data' },
                { id: 'contractAddress', title: 'Contract Address' },
                { id: 'methodId', title: 'Method ID' },
                { id: 'functionName', title: 'Function Name' }
            ],
            fieldDelimiter: ',',
            recordDelimiter: '\n',
            alwaysQuote: true
        });

        // Process transactions in batches and handle null/undefined values
        const BATCH_SIZE = 1000;
        for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
            const batch = transactions.slice(i, i + BATCH_SIZE);
            await csvWriter.writeRecords(batch.map(tx => ({
                hash: tx.hash || '',
                blockNumber: tx.blockNumber?.toString() || '',
                timeStamp: tx.timeStamp ? new Date(Number(tx.timeStamp) * 1000).toISOString() : '',
                from: tx.from || '',
                to: tx.to || '',
                value: tx.value?.toString() || '0',
                gas: tx.gas?.toString() || '0',
                gasPrice: tx.gasPrice?.toString() || '0',
                isError: tx.isError?.toString() || '0',
                txreceipt_status: tx.txreceipt_status?.toString() || '',
                input: tx.input || '',
                contractAddress: tx.contractAddress || '',
                methodId: tx.methodId || '',
                functionName: tx.functionName || ''
            })));
        }

        const lastBlock = Math.max(...transactions.map(t => Number(t.blockNumber) || 0));
        await this.updateState(
            organizationName,
            type === 'normal' ? 'normal' : 'internal',
            lastBlock,
            transactions.length
        );

        logger.info(`Saved ${transactions.length} ${type} transactions for ${organizationName} (Last block: ${lastBlock})`);
    } catch (error) {
        logger.error(`Failed to save transactions for ${organizationName}`, error);
        throw error;
    }
}

async saveTokenTransfers(
    organizationName: string,
    transfers: TokenTransfer[]
): Promise<void> {
    if (transfers.length === 0) return;

    try {
        const orgDir = this.getOrganizationDir(organizationName);
        await fs.ensureDir(orgDir);
        const transfersDir = path.join(orgDir, 'transfers');
        await fs.ensureDir(transfersDir);

        const filePath = path.join(transfersDir, 'token_transfers.csv');
        const fileExists = await fs.pathExists(filePath);

        // Sort transfers by block number
        transfers.sort((a, b) => Number(a.blockNumber) - Number(b.blockNumber));

        const csvWriter = createObjectCsvWriter({
            path: filePath,
            append: fileExists,
            header: [
                { id: 'hash', title: 'Hash' },
                { id: 'blockNumber', title: 'Block Number' },
                { id: 'timeStamp', title: 'Timestamp' },
                { id: 'from', title: 'From' },
                { id: 'to', title: 'To' },
                { id: 'value', title: 'Value' },
                { id: 'contractAddress', title: 'Token Contract' },
                { id: 'tokenName', title: 'Token Name' },
                { id: 'tokenSymbol', title: 'Token Symbol' },
                { id: 'tokenDecimal', title: 'Token Decimals' },
                { id: 'transactionIndex', title: 'Transaction Index' },
                { id: 'gas', title: 'Gas' },
                { id: 'gasPrice', title: 'Gas Price' },
                { id: 'gasUsed', title: 'Gas Used' }
            ],
            fieldDelimiter: ',',
            recordDelimiter: '\n',
            alwaysQuote: true
        });

        // Process transfers in batches
        const BATCH_SIZE = 1000;
        for (let i = 0; i < transfers.length; i += BATCH_SIZE) {
            const batch = transfers.slice(i, i + BATCH_SIZE);
            await csvWriter.writeRecords(batch.map(transfer => ({
                ...transfer,
                timeStamp: new Date(Number(transfer.timeStamp) * 1000).toISOString(),
                value: transfer.value.toString(),
                gasPrice: transfer.gasPrice.toString(),
                gasUsed: transfer.gasUsed.toString()
            })));
        }

        const lastBlock = Math.max(...transfers.map(t => Number(t.blockNumber)));
        await this.updateState(organizationName, 'tokenTransfers', lastBlock, transfers.length);

        logger.info(`Saved ${transfers.length} token transfers for ${organizationName} (Last block: ${lastBlock})`);
    } catch (error) {
        logger.error(`Failed to save token transfers for ${organizationName}`, error);
        throw error;
    }
  }
}