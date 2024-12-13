// src/infrastructure/persistence/FileSystemStorage.ts
import fs from 'fs-extra';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { IDataStorage, StorageState } from '../../core/interfaces/IDataStorage';
import { Organization, Transaction, TokenTransfer } from '../../core/entities';
import { EventLog } from '../../core/types';
import { createLogger } from '../logging/logger';
import { StorageError } from '../../core/errors';

const logger = createLogger('FileSystemStorage');

interface FileSystemStorageOptions {
  baseDir?: string;
  batchSize?: number;
  createBackups?: boolean;
}

export class FileSystemStorage implements IDataStorage {
  private readonly baseDir: string;
  private readonly organizationsDir: string;
  private readonly batchSize: number;
  private readonly createBackups: boolean;

  constructor(options: FileSystemStorageOptions = {}) {
    this.baseDir = options.baseDir || path.join(process.cwd(), 'data');
    this.organizationsDir = path.join(this.baseDir, 'organizations');
    this.batchSize = options.batchSize || 1000;
    this.createBackups = options.createBackups || false;
    this.initializeStorage();
  }

  private async initializeStorage(): Promise<void> {
    try {
      await fs.ensureDir(this.baseDir);
      await fs.ensureDir(this.organizationsDir);
      logger.info('Storage system initialized successfully');
    } catch (error) {
      const msg = 'Failed to initialize storage system';
      logger.error(msg, error);
      throw new StorageError(msg);
    }
  }

  private getOrganizationDir(name: string): string {
    return path.join(this.organizationsDir, this.sanitizeFileName(name));
  }

  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }

  async saveOrganization(organization: Organization): Promise<void> {
    try {
      const orgDir = this.getOrganizationDir(organization.name);
      await fs.ensureDir(orgDir);

      // Create required subdirectories
      await Promise.all([
        fs.ensureDir(path.join(orgDir, 'transactions')),
        fs.ensureDir(path.join(orgDir, 'transfers')),
        fs.ensureDir(path.join(orgDir, 'contracts')),
        fs.ensureDir(path.join(orgDir, 'events'))
      ]);

      const metadataPath = path.join(orgDir, 'metadata.json');
      await this.writeJSONSafely(metadataPath, {
        ...organization,
        lastUpdated: new Date().toISOString()
      });

      await this.initializeState(organization.name);
      logger.info(`Organization ${organization.name} saved successfully`);
    } catch (error) {
      throw new StorageError(`Failed to save organization ${organization.name}`);
    }
  }

  async getOrganization(address: string): Promise<Organization | null> {
    try {
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
      throw new StorageError(`Failed to get organization for address ${address}`);
    }
  }

  async saveTransactions(
    organizationName: string,
    transactions: Transaction[],
    type: 'normal' | 'internal'
  ): Promise<void> {
    if (transactions.length === 0) return;

    try {
      const txDir = path.join(this.getOrganizationDir(organizationName), 'transactions');
      await fs.ensureDir(txDir);

      const filePath = path.join(txDir, `${type}.csv`);
      const fileExists = await fs.pathExists(filePath);

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

      // Process in batches
      for (let i = 0; i < transactions.length; i += this.batchSize) {
        const batch = transactions.slice(i, i + this.batchSize);
        await csvWriter.writeRecords(batch.map(tx => ({
          ...tx,
          timeStamp: new Date(Number(tx.timeStamp) * 1000).toISOString(),
          value: tx.value.toString(),
          gasPrice: tx.gasPrice.toString()
        })));
      }

      // Update state
      const lastBlock = Math.max(...transactions.map(t => Number(t.blockNumber)));
      await this.updateTransactionState(organizationName, type, lastBlock, transactions.length);

      logger.info(`Saved ${transactions.length} ${type} transactions for ${organizationName}`);
    } catch (error) {
      throw new StorageError(`Failed to save ${type} transactions for ${organizationName}`);
    }
  }

  private async updateTransactionState(
    organizationName: string,
    type: 'normal' | 'internal',
    lastBlock: number,
    count: number
  ): Promise<void> {
    const currentState = await this.getLastProcessedState(organizationName);
    if (!currentState) {
      await this.initializeState(organizationName);
    }

    const state = await this.getLastProcessedState(organizationName);
    if (state) {
      state.transactionTypes[type].lastBlock = Math.max(
        state.transactionTypes[type].lastBlock,
        lastBlock
      );
      state.transactionTypes[type].count += count;
      state.transactionTypes[type].lastProcessedTimestamp = new Date().toISOString();
      state.lastProcessedBlock = Math.max(state.lastProcessedBlock, lastBlock);
      state.totalTransactions += count;
      state.lastProcessedTimestamp = new Date().toISOString();

      await this.writeJSONSafely(
        path.join(this.getOrganizationDir(organizationName), 'state.json'),
        state
      );
    }
  }

  async saveTokenTransfers(organizationName: string, transfers: TokenTransfer[]): Promise<void> {
    if (transfers.length === 0) return;

    try {
      const transfersDir = path.join(this.getOrganizationDir(organizationName), 'transfers');
      await fs.ensureDir(transfersDir);

      const filePath = path.join(transfersDir, 'token_transfers.csv');
      const fileExists = await fs.pathExists(filePath);

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
          { id: 'tokenDecimal', title: 'Token Decimals' }
        ],
        fieldDelimiter: ',',
        recordDelimiter: '\n',
        alwaysQuote: true
      });

      for (let i = 0; i < transfers.length; i += this.batchSize) {
        const batch = transfers.slice(i, i + this.batchSize);
        await csvWriter.writeRecords(batch.map(transfer => ({
          ...transfer,
          timeStamp: new Date(Number(transfer.timeStamp) * 1000).toISOString(),
          value: transfer.value.toString()
        })));
      }

      await this.updateTokenTransferState(
        organizationName,
        Math.max(...transfers.map(t => Number(t.blockNumber))),
        transfers.length
      );

      logger.info(`Saved ${transfers.length} token transfers for ${organizationName}`);
    } catch (error) {
      throw new StorageError(`Failed to save token transfers for ${organizationName}`);
    }
  }

  private async updateTokenTransferState(
    organizationName: string,
    lastBlock: number,
    count: number
  ): Promise<void> {
    const currentState = await this.getLastProcessedState(organizationName);
    if (!currentState) {
      await this.initializeState(organizationName);
    }

    const state = await this.getLastProcessedState(organizationName);
    if (state) {
      state.transactionTypes.tokenTransfers.lastBlock = Math.max(
        state.transactionTypes.tokenTransfers.lastBlock,
        lastBlock
      );
      state.transactionTypes.tokenTransfers.count += count;
      state.transactionTypes.tokenTransfers.lastProcessedTimestamp = new Date().toISOString();
      state.lastProcessedBlock = Math.max(state.lastProcessedBlock, lastBlock);
      state.lastProcessedTimestamp = new Date().toISOString();

      await this.writeJSONSafely(
        path.join(this.getOrganizationDir(organizationName), 'state.json'),
        state
      );
    }
  }

  async saveContractEvents(
    organizationName: string,
    contractAddress: string,
    events: EventLog[]
  ): Promise<void> {
    if (events.length === 0) return;

    try {
      const contractDir = path.join(
        this.getOrganizationDir(organizationName),
        'contracts',
        contractAddress,
        'events'
      );
      await fs.ensureDir(contractDir);

      // Group events by type
      const eventsByType = events.reduce((acc, event) => {
        const type = event.eventName || 'unknown';
        if (!acc[type]) acc[type] = [];
        acc[type].push(event);
        return acc;
      }, {} as Record<string, EventLog[]>);

      // Save each event type
      for (const [eventType, eventLogs] of Object.entries(eventsByType)) {
        const filePath = path.join(contractDir, `${this.sanitizeFileName(eventType)}.json`);
        await this.appendEvents(filePath, eventLogs);
      }

      // Update state
      await this.updateEventState(organizationName, contractAddress, events);

      logger.info(`Saved ${events.length} events for contract ${contractAddress}`);
    } catch (error) {
      throw new StorageError(`Failed to save events for contract ${contractAddress}`);
    }
  }

  private async appendEvents(filePath: string, newEvents: EventLog[]): Promise<void> {
    const existingEvents = await fs.pathExists(filePath) 
      ? await fs.readJSON(filePath) 
      : [];

    const updatedEvents = [...existingEvents, ...newEvents]
      .sort((a, b) => Number(a.blockNumber) - Number(b.blockNumber));

    await this.writeJSONSafely(filePath, updatedEvents);
  }

  private async updateEventState(
    organizationName: string,
    contractAddress: string,
    events: EventLog[]
  ): Promise<void> {
    const state = await this.getLastProcessedState(organizationName);
    if (!state) return;

    if (!state.events) {
      state.events = {
        lastBlock: 0,
        count: 0,
        lastProcessedTimestamp: new Date().toISOString(),
        contractAddresses: {}
      };
    }

    if (!state.events.contractAddresses[contractAddress]) {
      state.events.contractAddresses[contractAddress] = {
        lastBlock: 0,
        eventCounts: {}
      };
    }

    const contractState = state.events.contractAddresses[contractAddress];
    const lastBlock = Math.max(...events.map(e => Number(e.blockNumber)));

    // Update event counts
    events.forEach(event => {
      const eventType = event.eventName || 'unknown';
      contractState.eventCounts[eventType] = (contractState.eventCounts[eventType] || 0) + 1;
    });

    contractState.lastBlock = Math.max(contractState.lastBlock, lastBlock);
    state.events.count += events.length;
    state.events.lastBlock = Math.max(state.events.lastBlock, lastBlock);
    state.events.lastProcessedTimestamp = new Date().toISOString();

    await this.writeJSONSafely(
      path.join(this.getOrganizationDir(organizationName), 'state.json'),
      state
    );
  }

  async getLastProcessedState(name: string): Promise<StorageState | null> {
    try {
      const statePath = path.join(this.getOrganizationDir(name), 'state.json');
      if (await fs.pathExists(statePath)) {
        return await fs.readJSON(statePath);
      }
      return null;
    } catch (error) {
      throw new StorageError(`Failed to get state for ${name}`);
    }
  }

  private async writeJSONSafely(filePath: string, data: any): Promise<void> {
    const tempPath = `${filePath}.tmp`;
    const backupPath = `${filePath}.backup`;

    try {
      if (this.createBackups && await fs.pathExists(filePath)) {
        await fs.copy(filePath, backupPath);
      }

      await fs.writeJSON(tempPath, data, { spaces: 2 });
      await fs.rename(tempPath, filePath);

      if (this.createBackups && await fs.pathExists(backupPath)) {
        await fs.remove(backupPath);
      }
    } catch (error) {
      if (await fs.pathExists(tempPath)) {
        await fs.remove(tempPath);
      }
      if (this.createBackups && await fs.pathExists(backupPath)) {
        await fs.rename(backupPath, filePath);
      }
      throw new StorageError(`Failed to write file: ${filePath}`);
    }
  }

  private async initializeState(organizationName: string): Promise<void> {
    const statePath = path.join(this.getOrganizationDir(organizationName), 'state.json');
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
        },
        events: {
          lastBlock: 0,
          count: 0,
          lastProcessedTimestamp: new Date().toISOString(),
          contractAddresses: {}
        }
      };
      await this.writeJSONSafely(statePath, initialState);
    }
  }
}

// OLD implemetation working only with etherscan transactions
/*
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
            // Ensure all fields are quoted to handle special characters
            fieldDelimiter: ',',
            recordDelimiter: '\n',
            alwaysQuote: true
        });

        // Process transactions in smaller batches to avoid memory issues
        const BATCH_SIZE = 1000;
        for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
            const batch = transactions.slice(i, i + BATCH_SIZE);
            await csvWriter.writeRecords(batch.map(tx => ({
                ...tx,
                timeStamp: new Date(Number(tx.timeStamp) * 1000).toISOString(),
                value: tx.value.toString(),
                gasPrice: tx.gasPrice.toString(),
                input: tx.input || '',
                contractAddress: tx.contractAddress || '',
                methodId: tx.methodId || '',
                functionName: tx.functionName || ''
            })));
        }

        const lastBlock = Math.max(...transactions.map(t => Number(t.blockNumber)));
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
  */
 