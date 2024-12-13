import { Address, BlockNumber, Timestamp, BigIntString } from './types';

export class TreasuryAction {
  constructor(
    public readonly id: string,
    public readonly proposalId: BigIntString,
    public readonly target: Address,
    public readonly value: BigIntString,
    public readonly signature: string,
    public readonly data: string,
    public readonly executedAt: Timestamp,
    public readonly blockNumber: BlockNumber,
    public readonly succeeded: boolean
  ) {}

  static create(data: Partial<TreasuryAction>): TreasuryAction {
    if (!data.id || !data.proposalId || !data.target) {
      throw new Error('Missing required treasury action fields');
    }
    return new TreasuryAction(
      data.id,
      data.proposalId,
      data.target,
      data.value || '0',
      data.signature || '',
      data.data || '',
      data.executedAt || Math.floor(Date.now() / 1000),
      data.blockNumber || 0,
      data.succeeded ?? true
    );
  }
}