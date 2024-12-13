// src/infrastructure/persistence/dao/DAOEventStorage.ts
import { promises as fs } from 'fs';
import path from 'path';
import { 
  ProposalEventData,
  VoteEventData,
  DelegateEventData,
  TokenTransferEventData,
  ExecuteEventData
} from '../../providers/types/dao-events';
import { createLogger } from '../../logging/logger';
import { StorageError } from '../../../core/errors';

const logger = createLogger('DAOEventStorage');

export class DAOEventStorage {
  constructor(private readonly baseDir: string) {}

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new StorageError(
        `Failed to create directory: ${dirPath}`,
        undefined,
        error
      );
    }
  }

  private getOrganizationPath(organizationName: string): string {
    return path.join(this.baseDir, 'organizations', organizationName);
  }

  private async writeJSON(filePath: string, data: any): Promise<void> {
    try {
      await fs.writeFile(
        filePath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );
    } catch (error) {
      throw new StorageError(
        `Failed to write file: ${filePath}`,
        undefined,
        error
      );
    }
  }

  private async readJSON(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw new StorageError(
        `Failed to read file: ${filePath}`,
        undefined,
        error
      );
    }
  }

  async saveProposalEvents(
    organizationName: string,
    proposals: ProposalEventData[]
  ): Promise<void> {
    const orgPath = this.getOrganizationPath(organizationName);
    const proposalsPath = path.join(orgPath, 'governance', 'proposals.json');

    await this.ensureDirectoryExists(path.dirname(proposalsPath));

    const existingProposals = await this.readJSON(proposalsPath) || [];
    const updatedProposals = this.mergeProposalEvents(
      existingProposals,
      proposals
    );

    await this.writeJSON(proposalsPath, updatedProposals);
    logger.info(`Saved ${proposals.length} proposals for ${organizationName}`);
  }

  async saveVoteEvents(
    organizationName: string,
    votes: VoteEventData[]
  ): Promise<void> {
    const orgPath = this.getOrganizationPath(organizationName);
    const votesPath = path.join(orgPath, 'governance', 'votes.json');

    await this.ensureDirectoryExists(path.dirname(votesPath));

    const existingVotes = await this.readJSON(votesPath) || [];
    const updatedVotes = this.mergeVoteEvents(existingVotes, votes);

    await this.writeJSON(votesPath, updatedVotes);
    logger.info(`Saved ${votes.length} votes for ${organizationName}`);
  }

  async saveDelegateEvents(
    organizationName: string,
    delegations: DelegateEventData[]
  ): Promise<void> {
    const orgPath = this.getOrganizationPath(organizationName);
    const delegationsPath = path.join(orgPath, 'governance', 'delegations.json');

    await this.ensureDirectoryExists(path.dirname(delegationsPath));

    const existingDelegations = await this.readJSON(delegationsPath) || [];
    const updatedDelegations = this.mergeDelegateEvents(
      existingDelegations,
      delegations
    );

    await this.writeJSON(delegationsPath, updatedDelegations);
    logger.info(`Saved ${delegations.length} delegations for ${organizationName}`);
  }

  async updateDAOState(
    organizationName: string,
    state: any
  ): Promise<void> {
    const orgPath = this.getOrganizationPath(organizationName);
    const statePath = path.join(orgPath, 'state.json');

    await this.ensureDirectoryExists(path.dirname(statePath));
    
    const existingState = await this.readJSON(statePath) || {};
    const updatedState = {
      ...existingState,
      ...state,
      lastUpdated: new Date().toISOString()
    };

    await this.writeJSON(statePath, updatedState);
    logger.info(`Updated state for ${organizationName}`);
  }

  private mergeProposalEvents(
    existing: ProposalEventData[],
    newProposals: ProposalEventData[]
  ): ProposalEventData[] {
    const proposalMap = new Map(
      existing.map(p => [p.proposalId.toString(), p])
    );

    for (const proposal of newProposals) {
      const key = proposal.proposalId.toString();
      if (!proposalMap.has(key) || 
          proposalMap.get(key)!.blockNumber < proposal.blockNumber) {
        proposalMap.set(key, proposal);
      }
    }

    return Array.from(proposalMap.values()).sort((a, b) => 
      a.blockNumber - b.blockNumber
    );
  }

  private mergeVoteEvents(
    existing: VoteEventData[],
    newVotes: VoteEventData[]
  ): VoteEventData[] {
    const voteMap = new Map(
      existing.map(v => [`${v.proposalId}-${v.voter}`, v])
    );

    for (const vote of newVotes) {
      const key = `${vote.proposalId}-${vote.voter}`;
      if (!voteMap.has(key) || 
          voteMap.get(key)!.blockNumber < vote.blockNumber) {
        voteMap.set(key, vote);
      }
    }

    return Array.from(voteMap.values()).sort((a, b) => 
      a.blockNumber - b.blockNumber
    );
  }

  private mergeDelegateEvents(
    existing: DelegateEventData[],
    newDelegations: DelegateEventData[]
  ): DelegateEventData[] {
    const delegationMap = new Map(
      existing.map(d => [`${d.delegator}-${d.blockNumber}`, d])
    );

    for (const delegation of newDelegations) {
      const key = `${delegation.delegator}-${delegation.blockNumber}`;
      if (!delegationMap.has(key)) {
        delegationMap.set(key, delegation);
      }
    }

    return Array.from(delegationMap.values()).sort((a, b) => 
      a.blockNumber - b.blockNumber
    );
  }
}