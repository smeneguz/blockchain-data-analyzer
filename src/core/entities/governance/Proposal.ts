import { Address, BlockNumber, Timestamp, BigIntString, ProposalState } from './types';

export class Proposal {
  constructor(
    public readonly id: BigIntString,
    public readonly proposer: Address,
    public readonly description: string,
    public readonly startBlock: BlockNumber,
    public readonly endBlock: BlockNumber,
    public readonly createdAt: Timestamp,
    public readonly state: ProposalState,
    public readonly quorumVotes: BigIntString,
    public readonly proposalThreshold: BigIntString,
    public readonly executedAt?: Timestamp,
    public readonly canceledAt?: Timestamp,
    public readonly targets?: Address[],
    public readonly values?: BigIntString[],
    public readonly signatures?: string[],
    public readonly calldatas?: string[]
  ) {}

  static create(data: Partial<Proposal>): Proposal {
    if (!data.id || !data.proposer || !data.startBlock || !data.endBlock) {
      throw new Error('Missing required proposal fields');
    }
    return new Proposal(
      data.id,
      data.proposer,
      data.description || '',
      data.startBlock,
      data.endBlock,
      data.createdAt || Math.floor(Date.now() / 1000),
      data.state || ProposalState.Pending,
      data.quorumVotes || '0',
      data.proposalThreshold || '0',
      data.executedAt,
      data.canceledAt,
      data.targets,
      data.values,
      data.signatures,
      data.calldatas
    );
  }
}