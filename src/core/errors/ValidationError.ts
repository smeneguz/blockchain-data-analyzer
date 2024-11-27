import { ApplicationError } from './ApplicationError';

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
  }
}