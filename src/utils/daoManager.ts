// src/utils/daoManager.ts
import fs from 'fs-extra';
import path from 'path';
import { ExtendedDAOConfig } from '../config/daos/template.config';
import { createLogger } from '../infrastructure/logging/logger';
import { DAOService } from '../application/services/DAOService';

const logger = createLogger('DAOManager');

export class DAOManager {
  private readonly configPath = path.join(process.cwd(), 'config', 'daos');
  private readonly dataPath = path.join(process.cwd(), 'data', 'organizations');

  constructor(private readonly daoService: DAOService) {}

  async addDAO(config: ExtendedDAOConfig): Promise<void> {
    try {
      // Validate configuration
      await this.validateConfig(config);

      // Save configuration
      const configFile = path.join(this.configPath, `${config.name.toLowerCase()}.config.ts`);
      await this.saveConfig(configFile, config);

      // Initialize data structure
      await this.initializeDataStructure(config);

      // Process initial data collection
      await this.daoService.processDAO(config);

      logger.info(`Successfully added and initialized ${config.name}`);
    } catch (error) {
      logger.error(`Failed to add DAO: ${config.name}`, error);
      throw error;
    }
  }

  async updateAllDAOs(): Promise<void> {
    const configs = await this.getAllConfigs();
    
    for (const config of configs) {
      try {
        await this.daoService.processDAO(config, {
          resume: true,
          includeEvents: true,
          includeTransactions: true
        });
        
        // Update last updated timestamp
        config.lastUpdated = new Date().toISOString();
        await this.saveConfig(
          path.join(this.configPath, `${config.name.toLowerCase()}.config.ts`),
          config
        );
      } catch (error) {
        logger.error(`Failed to update DAO: ${config.name}`, error);
      }
    }
  }

  private async validateConfig(config: ExtendedDAOConfig): Promise<void> {
    // Implement comprehensive validation
  }

  private async saveConfig(filePath: string, config: ExtendedDAOConfig): Promise<void> {
    const configContent = `
import { ExtendedDAOConfig } from './template.config';

export const ${config.name.replace(/\s+/g, '')}Config: ExtendedDAOConfig = ${
      JSON.stringify(config, null, 2)
    };
`;
    await fs.writeFile(filePath, configContent, 'utf8');
  }

  private async initializeDataStructure(config: ExtendedDAOConfig): Promise<void> {
    const daoPath = path.join(this.dataPath, config.name.toLowerCase());
    await fs.ensureDir(daoPath);

    // Create necessary subdirectories and initial state files
    const dirs = [
      'transactions',
      'transfers',
      'events',
      'snapshots',
      'analysis'
    ];

    for (const dir of dirs) {
      await fs.ensureDir(path.join(daoPath, dir));
    }

    // Initialize metadata and state files
    await fs.writeJSON(
      path.join(daoPath, 'metadata.json'),
      {
        ...config,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      },
      { spaces: 2 }
    );
  }
}