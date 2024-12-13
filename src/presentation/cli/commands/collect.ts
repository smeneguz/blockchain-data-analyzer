// src/presentation/cli/commands/collect.ts
import { Command } from 'commander';
import { DAOService } from '../../../application/services/DAOService';
import { AlchemyProvider } from '../../../infrastructure/providers/alchemy/AlchemyProvider';
import { EtherscanProvider } from '../../../infrastructure/providers/etherscan/EtherscanProvider';
import { FileSystemStorage } from '../../../infrastructure/persistence/FileSystemStorage';
import { createLogger } from '../../../infrastructure/logging/logger';
import { config } from '../../../config/config';
import { loadDAOConfig } from '../../../utils/configLoader';
import { NetworkConfig } from '../../../infrastructure/providers/types';

const logger = createLogger('CollectCommand');

const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  mainnet: {
    name: 'mainnet',
    chainId: 1,
    rpcUrl: 'https://eth-mainnet.alchemyapi.io/v2/'
  },
  goerli: {
    name: 'goerli',
    chainId: 5,
    rpcUrl: 'https://eth-goerli.alchemyapi.io/v2/'
  },
  sepolia: {
    name: 'sepolia',
    chainId: 11155111,
    rpcUrl: 'https://eth-sepolia.alchemyapi.io/v2/'
  }
};

export function createCollectCommand(): Command {
  const command = new Command('collect')
    .description('Collect DAO-specific blockchain data')
    .requiredOption('-c, --config <name>', 'Name of the DAO configuration')
    .option('-f, --from-block <block>', 'Starting block number')
    .option('-t, --to-block <block>', 'Ending block number')
    .option('--include-transactions', 'Include basic transactions', true)
    .option('--include-events', 'Include DAO events', true)
    .option('--resume', 'Resume from last processed block')
    .action(async (options) => {
      try {
        logger.info('Starting DAO data collection with options:', options);

        if (!config.etherscan.apiKey || !config.alchemy.apiKey) {
          throw new Error('Both ETHERSCAN_API_KEY and ALCHEMY_API_KEY are required');
        }

        const networkName = config.etherscan.network.toLowerCase();
        const networkConfig = NETWORK_CONFIGS[networkName];
        if (!networkConfig) {
          throw new Error(`Unsupported network: ${networkName}`);
        }

        // Update RPC URL with API key
        networkConfig.rpcUrl = `${networkConfig.rpcUrl}${config.alchemy.apiKey}`;

        const storage = new FileSystemStorage();
        
        const etherscanProvider = new EtherscanProvider({
          apiKey: config.etherscan.apiKey,
          network: networkConfig,
          maxRetries: 3
        });

        const alchemyProvider = new AlchemyProvider({
          apiKey: config.alchemy.apiKey,
          network: networkConfig,
          maxRetries: 3
        });

        const service = new DAOService(
          etherscanProvider,
          alchemyProvider,
          storage
        );

        const daoConfig = await loadDAOConfig(options.config);

        await service.processDAO(daoConfig, {
          startBlock: options.fromBlock ? parseInt(options.fromBlock) : undefined,
          endBlock: options.toBlock ? parseInt(options.toBlock) : undefined,
          includeEvents: options.includeEvents,
          includeTransactions: options.includeTransactions,
          resume: options.resume
        });

        logger.info('Collection completed successfully');
      } catch (error) {
        logger.error('Collection failed:', error);
        process.exit(1);
      }
    });

  return command;
}