// src/application/validation/dataValidation.ts
import { DAOConfigSchema } from '../../core/schemas/dao-config.schema';
import { createLogger } from '../../infrastructure/logging/logger';

const logger = createLogger('DataValidation');

export async function validateDAOConfig(configPath: string) {
  try {
    const config = require(configPath);
    return DAOConfigSchema.parse(config);
  } catch (error) {
    logger.error('Invalid DAO configuration:', error);
    throw error;
  }
}

export async function validateBlockRange(startBlock?: number, endBlock?: number) {
  if (startBlock && endBlock && startBlock > endBlock) {
    throw new Error('Start block must be less than or equal to end block');
  }
}