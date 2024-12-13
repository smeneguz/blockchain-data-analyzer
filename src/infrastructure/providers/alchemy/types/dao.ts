// src/infrastructure/providers/alchemy/types/dao.ts
export interface ProposalCreatedEvent {
    id: string;
    proposer: string;
    targets: string[];
    values: string[];
    signatures: string[];
    calldatas: string[];
    startBlock: number;
    endBlock: number;
    description: string;
    proposalThreshold?: string;
    quorumVotes?: string;
}

export interface VoteCastEvent {
    voter: string;
    proposalId: string;
    support: boolean;
    votes: string;
    reason: string;
}

export interface DelegateChangedEvent {
    delegator: string;
    fromDelegate: string;
    toDelegate: string;
}

export interface TokenHolderState {
    balance: string;
    delegates: string;
    votingPower: string;
    lastUpdated: number;
}

export interface ProposalState {
    id: string;
    proposer: string;
    eta: string;
    startBlock: number;
    endBlock: number;
    forVotes: string;
    againstVotes: string;
    abstainVotes: string;
    canceled: boolean;
    executed: boolean;
    state: number; // 0=Pending, 1=Active, 2=Canceled, 3=Defeated, 4=Succeeded, 5=Queued, 6=Expired, 7=Executed
}

export interface GovernanceState {
    proposalCount: number;
    quorumVotes: string;
    proposalThreshold: string;
    votingDelay: number;
    votingPeriod: number;
}