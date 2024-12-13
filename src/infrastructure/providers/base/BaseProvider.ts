import { Transaction, TokenTransfer } from '../../../core/entities';
import { QueryOptions } from '../../../core/interfaces';
import { createLogger } from '../../logging/logger';
import { ProviderConfig, EventLog, EventFilter, ProviderError } from '../types';

const logger = createLogger('BaseProvider');

export abstract class BaseProvider {
    protected readonly lastRequestTime: number = 0;
    protected readonly maxRetries: number;
    protected readonly timeout: number;
    protected readonly rateLimitDelay: number;

    constructor(protected readonly config: ProviderConfig) {
        this.maxRetries = config.maxRetries || 3;
        this.timeout = config.timeout || 30000;
        this.rateLimitDelay = config.rateLimit?.timeWindow 
            ? (config.rateLimit.timeWindow / config.rateLimit.requestsPerSecond)
            : 200;
    }

    abstract getTransactions(
        address: string, 
        options?: QueryOptions
    ): Promise<Transaction[]>;

    abstract getInternalTransactions(
        address: string, 
        options?: QueryOptions
    ): Promise<Transaction[]>;

    abstract getTokenTransfers(
        address: string, 
        options?: QueryOptions
    ): Promise<TokenTransfer[]>;

    abstract getEvents(filter: EventFilter): Promise<EventLog[]>;

    abstract getContractEvents(
        address: string,
        eventSignature: string,
        fromBlock: number | string,
        toBlock: number | string
    ): Promise<EventLog[]>;

    abstract getBalance(address: string): Promise<string>;

    abstract getCurrentBlock(): Promise<number>;

    protected async withRetry<T>(
        operation: () => Promise<T>,
        context: string,
        retryCount = 0
    ): Promise<T> {
        try {
            await this.handleRateLimit();
            return await operation();
        } catch (error) {
            if (retryCount >= this.maxRetries) {
                this.logError(error, `${context} (Attempt ${retryCount + 1}/${this.maxRetries})`);
                throw this.createError(error as Error);
            }

            const delay = Math.pow(2, retryCount) * 1000;
            logger.warn(`Retrying ${context} in ${delay}ms (Attempt ${retryCount + 1}/${this.maxRetries})`);
            await this.delay(delay);
            return this.withRetry(operation, context, retryCount + 1);
        }
    }

    protected async handleRateLimit(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.rateLimitDelay) {
            await this.delay(this.rateLimitDelay - timeSinceLastRequest);
        }
    }

    protected async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    protected logError(error: unknown, context: string): void {
        logger.error(`Error in ${context}:`, {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            context,
        });
    }

    protected createError(error: Error): ProviderError {
        const providerError = new Error(error.message) as ProviderError;
        providerError.name = 'ProviderError';
        providerError.stack = error.stack;
        return providerError;
    }

    protected validateAddress(address: string): void {
        if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
            throw new Error('Invalid Ethereum address format');
        }
    }

    protected validateBlockRange(fromBlock?: number | string, toBlock?: number | string): void {
        if (fromBlock && toBlock && Number(fromBlock) > Number(toBlock)) {
            throw new Error('fromBlock must be less than or equal to toBlock');
        }
    }
}