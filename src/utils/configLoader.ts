// src/utils/configLoader.ts
import path from 'path';
import { DAOConfig } from '../core/interfaces/IDAOProvider';
import { createLogger } from '../infrastructure/logging/logger';

const logger = createLogger('ConfigLoader');

export async function loadDAOConfig(configName: string): Promise<DAOConfig> {
  try {
    const configPath = path.join(process.cwd(), 'config', 'daos', `${configName}.config`);
    
    // Try both .ts and .js extensions
    let config: { [key: string]: any } | undefined;
    try {
      config = require(`${configPath}.ts`);
    } catch {
      try {
        config = require(`${configPath}.js`);
      } catch {
        throw new Error(`Configuration file not found for DAO: ${configName}`);
      }
    }

    // Find the config export
    const configKey = Object.keys(config).find(key => key.endsWith('Config'));
    if (!configKey) {
      throw new Error(`No valid configuration found in ${configName} config file`);
    }

    const daoConfig = config[configKey];
    
    // Validate the config
    if (!daoConfig || !daoConfig.name || !daoConfig.contracts || !Array.isArray(daoConfig.contracts)) {
      throw new Error(`Invalid configuration format for ${configName}`);
    }

    return daoConfig;
  } catch (error) {
    logger.error(`Failed to load configuration for ${configName}:`, error);
    throw error;
  }
}