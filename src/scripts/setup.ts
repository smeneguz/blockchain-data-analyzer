// src/scripts/setup.ts
import fs from 'fs-extra';
import path from 'path';
import { logger, createLogger } from '../infrastructure/logging/logger';

// Create a setup-specific logger
const setupLogger = createLogger('Setup');

const envTemplate = `# Ethereum Network Configuration
ETHERSCAN_API_KEY=your_etherscan_api_key_here
ETHERSCAN_NETWORK=mainnet

# Alchemy Configuration
ALCHEMY_API_KEY=your_alchemy_api_key_here
ALCHEMY_NETWORK=mainnet

# Storage Configuration
STORAGE_BASE_DIR=./data
LOG_LEVEL=info

# Logging Configuration
LOG_LEVEL=info
`;

async function setup() {
  // Ensure initial logging directory exists
  const logsDir = path.join(process.cwd(), 'logs');
  await fs.ensureDir(logsDir);

  try {
    setupLogger.info('Starting setup process...');

    // Create necessary directories
    const dirs = [
      'data',
      'data/organizations',
      'logs'
    ];

    for (const dir of dirs) {
      await fs.ensureDir(dir);
      setupLogger.info(`Created directory: ${dir}`);
    }

    // Create registry file if it doesn't exist
    const registryPath = path.join('data', 'registry.json');
    if (!await fs.pathExists(registryPath)) {
      await fs.writeJSON(registryPath, {}, { spaces: 2 });
      setupLogger.info('Created registry file');
    }

    // Create or update .env file
    if (!await fs.pathExists('.env')) {
      await fs.writeFile('.env', envTemplate);
      setupLogger.info('Created .env file template');
      
      // Log instructions to console directly for better visibility
      console.log('\nIMPORTANT: Please update your .env file with API keys:');
      console.log('1. Open the .env file (nano .env)');
      console.log('2. Add your Etherscan API key');
      console.log('3. Add your Alchemy API key\n');
    }

    setupLogger.info('Setup completed successfully');
  } catch (error) {
    setupLogger.error('Setup failed', error);
    process.exit(1);
  }
}

// Set environment variable to prevent config validation during setup
process.env.SETUP_MODE = 'true';

setup().catch(error => {
  setupLogger.error('Unexpected error during setup', error);
  process.exit(1);
});