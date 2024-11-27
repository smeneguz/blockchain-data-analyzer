import { Command } from 'commander';
import { BlockchainService } from '../../../application/services/BlockchainService';
import { EtherscanClient } from '../../../infrastructure/api/etherscan/EtherscanClient';
import { FileSystemStorage } from '../../../infrastructure/persistence/FileSystemStorage';
import { createLogger } from '../../../infrastructure/logging/logger';
import { config } from '../../../config/config';
import { validateApiKey } from '../../../utils/validateApiKey';

const logger = createLogger('CLI:Analyze');

export function createAnalyzeCommand(): Command {
    const command = new Command('analyze')
      .description('Analyze an organization\'s blockchain activity')
      .requiredOption('-a, --address <address>', 'Ethereum address to analyze')
      .requiredOption('-n, --name <name>', 'Organization name')
      .option('-s, --start-block <block>', 'Starting block number')
      .option('-e, --end-block <block>', 'Ending block number')
      .option('--include-internal', 'Include internal transactions')
      .option('--include-tokens', 'Include token transfers')
      .option('--resume', 'Resume from last processed block')
      .action(async (options) => {
        try {
          logger.info('Starting analysis with options:', options);
  
          if (!config.etherscan.apiKey) {
            throw new Error('ETHERSCAN_API_KEY is not set in environment variables');
          }
  
          const isValidKey = await validateApiKey();
          if (!isValidKey) {
            throw new Error('Invalid or expired Etherscan API key');
          }
  
          const etherscanClient = new EtherscanClient(config.etherscan.apiKey, config.etherscan.network);
          const storage = new FileSystemStorage();
          const service = new BlockchainService(etherscanClient, storage);
  
          await service.analyzeOrganization(options.address, options.name, {
            startBlock: options.startBlock ? parseInt(options.startBlock) : undefined,
            endBlock: options.endBlock ? parseInt(options.endBlock) : undefined,
            includeInternalTransactions: options.includeInternal,
            includeTokenTransfers: options.includeTokens,
            resume: options.resume
          });
  
          logger.info('Analysis completed successfully');
        } catch (error) {
          logger.error('Analysis failed', error);
          process.exit(1);
        }
      });
  
    return command;
  }