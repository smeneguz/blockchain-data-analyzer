// src/presentation/cli/index.ts
import { Command } from 'commander';
import { createAnalyzeCommand } from './commands/analyze';
import { createCollectCommand } from './commands/collect';
import { createLogger } from '../../infrastructure/logging/logger';

const logger = createLogger('CLI');

export function createCli(): Command {
  const program = new Command()
    .name('blockchain-analyzer')
    .description('Blockchain data analysis tool')
    .version('1.0.0');

  program.addCommand(createAnalyzeCommand());
  program.addCommand(createCollectCommand());

  // Add error handling
  program.exitOverride();
  program.showHelpAfterError();

  return program;
}