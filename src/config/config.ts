// src/config/config.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Skip API key validation during setup
if (!process.env.SETUP_MODE) {
  if (!process.env.ETHERSCAN_API_KEY) {
    throw new Error('ETHERSCAN_API_KEY environment variable is required');
  }

  if (process.argv.includes('collect') && !process.env.ALCHEMY_API_KEY) {
    throw new Error('ALCHEMY_API_KEY environment variable is required for DAO collection');
  }
}

// Configuration schema
const configSchema = z.object({
  etherscan: z.object({
    apiKey: z.string().min(1),
    network: z.enum(['mainnet', 'goerli', 'sepolia', 'polygon']).default('mainnet'),
    baseUrl: z.string().url().optional(),
    rateLimit: z.object({
      requestsPerSecond: z.number().positive().default(5),
      timeWindow: z.number().positive().default(1000),
    }).default({
      requestsPerSecond: 5,
      timeWindow: 1000,
    }),
  }),
  alchemy: z.object({
    apiKey: z.string().min(1),
    network: z.enum(['mainnet', 'goerli', 'sepolia', 'polygon']).default('mainnet'),
    rateLimit: z.object({
      requestsPerSecond: z.number().positive().default(5),
      timeWindow: z.number().positive().default(1000),
    }).default({
      requestsPerSecond: 5,
      timeWindow: 1000,
    }),
  }),
  storage: z.object({
    baseDir: z.string().default(path.join(process.cwd(), 'data')),
    organizationsDir: z.string().optional(),
    registryFile: z.string().optional(),
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    directory: z.string().default(path.join(process.cwd(), 'logs')),
  }),
});

type Config = z.infer<typeof configSchema>;

// Default configuration values
const defaultConfig: Config = {
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || '',
    network: 'mainnet',
    rateLimit: {
      requestsPerSecond: 5,
      timeWindow: 1000,
    },
  },
  alchemy: {
    apiKey: process.env.ALCHEMY_API_KEY || '',
    network: 'mainnet',
    rateLimit: {
      requestsPerSecond: 5,
      timeWindow: 1000,
    },
  },
  storage: {
    baseDir: path.join(process.cwd(), 'data'),
    organizationsDir: path.join(process.cwd(), 'data', 'organizations'),
    registryFile: path.join(process.cwd(), 'data', 'registry.json'),
  },
  logging: {
    level: 'info',
    directory: path.join(process.cwd(), 'logs'),
  },
};

// Validate and export configuration
export const config = configSchema.parse({
  ...defaultConfig,
  etherscan: {
    ...defaultConfig.etherscan,
    apiKey: process.env.ETHERSCAN_API_KEY || defaultConfig.etherscan.apiKey,
    network: process.env.ETHERSCAN_NETWORK || defaultConfig.etherscan.network,
  },
  alchemy: {
    ...defaultConfig.alchemy,
    apiKey: process.env.ALCHEMY_API_KEY || defaultConfig.alchemy.apiKey,
    network: process.env.ALCHEMY_NETWORK || defaultConfig.alchemy.network,
  },
  storage: {
    ...defaultConfig.storage,
    baseDir: process.env.STORAGE_BASE_DIR || defaultConfig.storage.baseDir,
  },
  logging: {
    ...defaultConfig.logging,
    level: process.env.LOG_LEVEL || defaultConfig.logging.level,
  },
});

export type { Config };