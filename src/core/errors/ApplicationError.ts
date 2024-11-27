export class ApplicationError extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly details?: unknown
    ) {
      super(message);
      this.name = this.constructor.name;
      Error.captureStackTrace(this, this.constructor);
    }
  }