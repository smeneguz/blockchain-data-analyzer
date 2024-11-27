export class RateLimiter {
    private queue: Array<() => Promise<any>> = [];
    private processing = false;
    private lastRequestTime = 0;
  
    constructor(private requestsPerSecond: number, private timeWindow: number = 1000) {}
  
    async schedule<T>(fn: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        this.queue.push(async () => {
          try {
            const result = await fn();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
  
        if (!this.processing) {
          this.processQueue();
        }
      });
    }
  
    private async processQueue(): Promise<void> {
      this.processing = true;
  
      while (this.queue.length > 0) {
        const now = Date.now();
        const timeToWait = Math.max(0, this.lastRequestTime + (this.timeWindow / this.requestsPerSecond) - now);
  
        if (timeToWait > 0) {
          await new Promise(resolve => setTimeout(resolve, timeToWait));
        }
  
        const fn = this.queue.shift()!;
        this.lastRequestTime = Date.now();
        await fn();
      }
  
      this.processing = false;
    }
  }