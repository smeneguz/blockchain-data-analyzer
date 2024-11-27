// src/infrastructure/logging/logger.ts
import winston from 'winston';
import path from 'path';
import { config } from '../../config/config';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} ${level.toUpperCase()}: ${message}${stack ? '\n' + stack : ''}`;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(config.logging.directory, 'error.log'),
      level: 'error',
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(config.logging.directory, 'combined.log'),
    }),
  ],
});

// Error handler for uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export a function to create namespaced loggers
export function createLogger(namespace: string) {
  return {
    debug: (message: string, meta?: any) => logger.debug(`[${namespace}] ${message}`, meta),
    info: (message: string, meta?: any) => logger.info(`[${namespace}] ${message}`, meta),
    warn: (message: string, meta?: any) => logger.warn(`[${namespace}] ${message}`, meta),
    error: (message: string, error?: Error | any) => {
      const errorMessage = error instanceof Error ? 
        `${error.message}\n${error.stack}` : 
        error ? JSON.stringify(error) : '';
      logger.error(`[${namespace}] ${message}${errorMessage ? '\n' + errorMessage : ''}`);
    },
  };
}