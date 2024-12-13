// src/application/services/DAOService.ts
import { BlockchainService } from './BlockchainService';
import { AlchemyProvider } from '../../infrastructure/providers/alchemy/AlchemyProvider';
import { EtherscanProvider } from '../../infrastructure/providers/etherscan/EtherscanProvider';
import { FileSystemStorage } from '../../infrastructure/persistence/FileSystemStorage';
import { createLogger } from '../../infrastructure/logging/logger';
import { EventProcessor } from '../../infrastructure/utils/event-processor';
import { DAOConfig, DAOProcessingOptions } from '../../core/interfaces/IDAOProvider';
import { Organization } from '../../core/entities';

const logger = createLogger('DAOService');

export class DAOService {
  private readonly eventProcessor: EventProcessor;
  private readonly storage: FileSystemStorage;
  private readonly blockchainService: BlockchainService;

  constructor(
    private readonly etherscanProvider: EtherscanProvider,
    private readonly alchemyProvider: AlchemyProvider,
    storage: FileSystemStorage
  ) {
    this.storage = storage;
    this.eventProcessor = new EventProcessor([]);  // Initialize with empty ABI
    this.blockchainService = new BlockchainService(etherscanProvider, storage);
  }

  async processDAO(
    config: DAOConfig,
    options: DAOProcessingOptions = {}
  ): Promise<void> {
    try {
      logger.info(`Processing DAO ${config.name}`);

      const organization: Organization = {
        name: config.name,
        address: config.contracts[0].address, // Use first contract as main address
        chainId: 1, // Ethereum mainnet
        dateAdded: new Date().toISOString(),
        description: config.description,
        network: config.network,
        lastUpdated: new Date().toISOString(),
        contracts: config.contracts
      };

      await this.storage.saveOrganization(organization);

      // Process each contract
      for (const contract of config.contracts) {
        if (options.includeTransactions) {
          await this.blockchainService.analyzeOrganization(
            contract.address,
            config.name,
            {
              startBlock: options.startBlock || contract.startBlock,
              endBlock: options.endBlock,
              includeInternalTransactions: true,
              resume: options.resume
            }
          );
        }

        if (options.includeEvents) {
          const events = await this.alchemyProvider.getAllContractEvents(
            contract.address,
            options.startBlock || contract.startBlock || 0,
            options.endBlock || await this.alchemyProvider.getCurrentBlock()
          );

          if (events.length > 0) {
            await this.storage.saveContractEvents(
              config.name,
              contract.address,
              events
            );
          }
        }
      }

      logger.info(`Completed processing DAO ${config.name}`);
    } catch (error) {
      logger.error(`Failed to process DAO ${config.name}`, error);
      throw error;
    }
  }
}