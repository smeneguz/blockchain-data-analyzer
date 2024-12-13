// src/infrastructure/providers/utils/event-processor.ts
import { EventLog } from '../../core/types';
import { createLogger } from '../logging/logger';
import { ethers } from 'ethers';

const logger = createLogger('EventProcessor');

export class EventProcessor {
  private interface: ethers.Interface;

  constructor(abi: string | any[]) {
    this.interface = new ethers.Interface(abi);
  }

  async processEvents(events: EventLog[]): Promise<EventLog[]> {
    return events.map(event => {
      try {
        const parsedLog = this.interface.parseLog({
          topics: event.topics,
          data: event.data
        });

        if (!parsedLog) {
          return event;
        }

        return {
          ...event,
          eventName: parsedLog.name ?? 'UnknownEvent',
          args: this.formatArgs(parsedLog.args ?? {})
        };
      } catch (error) {
        logger.warn(`Failed to parse event in tx ${event.transactionHash}`, error);
        return event;
      }
    });
  }

  private formatArgs(args: Record<string, any>): Record<string, any> {
    const formatted: Record<string, any> = {};
    for (const [key, value] of Object.entries(args)) {
      if (isNaN(Number(key))) { // Skip numeric indices
        formatted[key] = this.formatValue(value);
      }
    }
    return formatted;
  }

  private formatValue(value: any): any {
    if (Array.isArray(value)) {
      return value.map(v => this.formatValue(v));
    }
    // Check for BigNumber-like object
    if (value && typeof value === 'object' && '_hex' in value) {
      return value.toString();
    }
    return value;
  }
}