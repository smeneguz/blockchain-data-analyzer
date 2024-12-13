import { BigIntString, BlockNumber, Timestamp } from './types';

export class GovernanceState {
  constructor(
    public readonly quorum: BigIntString,
    public readonly votingPeriod: number,
    public readonly votingDelay: number,
    public readonly proposalThreshold: BigIntString,
    public readonly totalProposals: number,
    public readonly activeProposals: number,
    public readonly lastUpdateBlock: BlockNumber,
    public readonly lastUpdateTimestamp: Timestamp
  ) {}

  static create(data: Partial<GovernanceState>): GovernanceState {
    return new GovernanceState(
      data.quorum || '0',
      data.votingPeriod || 0,
      data.votingDelay || 0,
      data.proposalThreshold || '0',
      data.totalProposals || 0,
      data.activeProposals || 0,
      data.lastUpdateBlock || 0,
      data.lastUpdateTimestamp || Math.floor(Date.now() / 1000)
    );
  }
}