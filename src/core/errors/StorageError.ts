import { ApplicationError } from './ApplicationError';

export class StorageError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 'STORAGE_ERROR', details);
  }
}