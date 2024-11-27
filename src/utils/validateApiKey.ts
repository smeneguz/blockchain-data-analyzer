import axios from 'axios';
import { config } from '../config/config';
import { createLogger } from '../infrastructure/logging/logger';

const logger = createLogger('ApiKeyValidator');

export async function validateApiKey(): Promise<boolean> {
  try {
    // Test the API key with a simple request
    const response = await axios.get('https://api.etherscan.io/api', {
      params: {
        module: 'stats',
        action: 'ethsupply',
        apikey: config.etherscan.apiKey,
      },
    });

    if (response.data.status === '1') {
      logger.info('API key validated successfully');
      return true;
    }

    logger.error('Invalid API key response:', response.data);
    return false;
  } catch (error) {
    logger.error('Failed to validate API key:', error);
    return false;
  }
}