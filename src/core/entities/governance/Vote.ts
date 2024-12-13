import { Address, BlockNumber, Timestamp, BigIntString, VoteSupport } from './types';

export class Vote {
  constructor(
    public readonly proposalId: BigIntString,
    public readonly voter: Address,
    public readonly support: VoteSupport,
    public readonly weight: BigIntString,
    public readonly reason: string,
    public readonly blockNumber: BlockNumber,
    public readonly timestamp: Timestamp
  ) {}

  static create(data: Partial<Vote>): Vote {
    if (!data.proposalId || !data.voter || data.support === undefined || !data.weight) {
      throw new Error('Missing required vote fields');
    }
    return new Vote(
      data.proposalId,
      data.voter,
      data.support,
      data.weight,
      data.reason || '',
      data.blockNumber || 0,
      data.timestamp || Math.floor(Date.now() / 1000)
    );
  }
}