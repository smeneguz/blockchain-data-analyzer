import { Command } from 'commander';
import { createAnalyzeCommand } from './commands/analyze';
import { createLogger } from '../../infrastructure/logging/logger';

const logger = createLogger('CLI');

export function createCli(): Command {
  const program = new Command()
    .name('blockchain-analyzer')
    .description('Blockchain data analysis tool')
    .version('1.0.0');

  program.addCommand(createAnalyzeCommand());

  // Add error handling
  program.exitOverride();
  program.showHelpAfterError();

  return program;
}