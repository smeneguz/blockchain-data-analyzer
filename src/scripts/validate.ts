// src/scripts/validate.ts
import dotenv from 'dotenv';
import { createLogger } from '../infrastructure/logging/logger';
import { config } from '../config/config';

const logger = createLogger('Validation');

async function validateEnvironment() {
  try {
    logger.info('Validating environment...');

    // Check API keys
    if (!process.env.ETHERSCAN_API_KEY) {
      throw new Error('ETHERSCAN_API_KEY is not set in .env file');
    }
    if (!process.env.ALCHEMY_API_KEY) {
      throw new Error('ALCHEMY_API_KEY is not set in .env file');
    }

    // Test configuration loading
    const { etherscan, alchemy, storage } = config;
    logger.info('Configuration loaded successfully');

    // Check directory structure
    const requiredDirs = [
      storage.baseDir,
      storage.organizationsDir
    ];

    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        throw new Error(`Required directory not found: ${dir}`);
      }
    }

    logger.info('Directory structure validated');
    logger.info('Environment validation completed successfully');
    return true;
  } catch (error) {
    logger.error('Validation failed:', error);
    return false;
  }
}

// Export for use in other scripts
export { validateEnvironment };

// Run directly if called as script
if (require.main === module) {
  validateEnvironment().then(valid => {
    process.exit(valid ? 0 : 1);
  });
}