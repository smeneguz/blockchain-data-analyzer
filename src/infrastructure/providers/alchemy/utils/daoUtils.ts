// src/infrastructure/providers/alchemy/utils/daoUtils.ts
import { ethers } from 'ethers';
import { EventLog } from '../types';
import { 
    ProposalCreatedEvent, 
    VoteCastEvent, 
    DelegateChangedEvent,
    ProposalState,
    GovernanceState,
    TokenHolderState 
} from '../types/dao';
import { GovernorBravoABI, GovernanceTokenABI } from '../abis';

export class DAOEventDecoder {
    private readonly governorInterface: ethers.Interface;
    private readonly tokenInterface: ethers.Interface;

    constructor() {
        this.governorInterface = new ethers.Interface(GovernorBravoABI);
        this.tokenInterface = new ethers.Interface(GovernanceTokenABI);
    }

    decodeProposalCreated(log: EventLog): ProposalCreatedEvent {
        const event = this.governorInterface.parseLog({
            topics: log.topics,
            data: log.data
        });

        return {
            id: event.args.id.toString(),
            proposer: event.args.proposer,
            targets: event.args.targets,
            values: event.args.values.map((v: any) => v.toString()),
            signatures: event.args.signatures,
            calldatas: event.args.calldatas,
            startBlock: event.args.startBlock.toNumber(),
            endBlock: event.args.endBlock.toNumber(),
            description: event.args.description,
            proposalThreshold: event.args.proposalThreshold?.toString(),
            quorumVotes: event.args.quorumVotes?.toString()
        };
    }

    decodeVoteCast(log: EventLog): VoteCastEvent {
        const event = this.governorInterface.parseLog({
            topics: log.topics,
            data: log.data
        });

        return {
            voter: event.args.voter,
            proposalId: event.args.proposalId.toString(),
            support: event.args.support === 1,
            votes: event.args.votes.toString(),
            reason: event.args.reason || ''
        };
    }

    decodeDelegateChanged(log: EventLog): DelegateChangedEvent {
        const event = this.tokenInterface.parseLog({
            topics: log.topics,
            data: log.data
        });

        return {
            delegator: event.args.delegator,
            fromDelegate: event.args.fromDelegate,
            toDelegate: event.args.toDelegate
        };
    }
}

export class DAOStateReader {
    private readonly provider: ethers.JsonRpcProvider;

    constructor(rpcUrl: string) {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
    }

    async getGovernanceState(governorAddress: string): Promise<GovernanceState> {
        const governor = new ethers.Contract(
            governorAddress,
            GovernorBravoABI,
            this.provider
        );

        const [
            proposalCount,
            quorumVotes,
            proposalThreshold,
            votingDelay,
            votingPeriod
        ] = await Promise.all([
            governor.proposalCount(),
            governor.quorumVotes(),
            governor.proposalThreshold(),
            governor.votingDelay(),
            governor.votingPeriod()
        ]);

        return {
            proposalCount: proposalCount.toNumber(),
            quorumVotes: quorumVotes.toString(),
            proposalThreshold: proposalThreshold.toString(),
            votingDelay: votingDelay.toNumber(),
            votingPeriod: votingPeriod.toNumber()
        };
    }

    async getProposalState(
        governorAddress: string,
        proposalId: string
    ): Promise<ProposalState> {
        const governor = new ethers.Contract(
            governorAddress,
            GovernorBravoABI,
            this.provider
        );

        const proposal = await governor.proposals(proposalId);
        const state = await governor.state(proposalId);

        return {
            id: proposal.id.toString(),
            proposer: proposal.proposer,
            eta: proposal.eta.toString(),
            startBlock: proposal.startBlock.toNumber(),
            endBlock: proposal.endBlock.toNumber(),
            forVotes: proposal.forVotes.toString(),
            againstVotes: proposal.againstVotes.toString(),
            abstainVotes: proposal.abstainVotes.toString(),
            canceled: proposal.canceled,
            executed: proposal.executed,
            state: state
        };
    }

    async getTokenHolderState(
        tokenAddress: string,
        holderAddress: string
    ): Promise<TokenHolderState> {
        const token = new ethers.Contract(
            tokenAddress,
            GovernanceTokenABI,
            this.provider
        );

        const [balance, delegate, votingPower] = await Promise.all([
            token.balanceOf(holderAddress),
            token.delegates(holderAddress),
            token.getVotes(holderAddress)
        ]);

        return {
            balance: balance.toString(),
            delegates: delegate,
            votingPower: votingPower.toString(),
            lastUpdated: Date.now()
        };
    }
}