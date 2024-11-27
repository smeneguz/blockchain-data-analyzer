#!/usr/bin/env node
import { createCli } from './presentation/cli';
import { createLogger } from './infrastructure/logging/logger';

const logger = createLogger('Main');

async function main() {
  try {
    const cli = createCli();
    await cli.parseAsync(process.argv);
  } catch (error) {
    logger.error('Application failed', error);
    process.exit(1);
  }
}

main();