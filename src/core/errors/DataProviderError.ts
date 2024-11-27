import { ApplicationError } from './ApplicationError';

export class DataProviderError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 'DATA_PROVIDER_ERROR', details);
  }
}