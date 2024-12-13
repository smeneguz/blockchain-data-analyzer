import { 
  Proposal,
  Vote,
  GovernanceState,
  TreasuryAction,
  Address,
  BlockNumber,
  BigIntString
} from '../entities/governance';
import { IBlockchainDataProvider } from './IBlockchainDataProvider';

export interface IDAOBlockchainProvider extends IBlockchainDataProvider, IDAOProvider {
  // This interface combines both capabilities
}

export interface DAOContract {
  address: string;
  type: 'governor' | 'token' | 'treasury';
  name?: string;
  startBlock?: number;
}

export interface DAOConfig {
  name: string;
  description?: string;
  network: string;
  contracts: DAOContract[];
}

export interface DAOProcessingOptions {
  startBlock?: number;
  endBlock?: number;
  includeTransactions?: boolean;
  includeEvents?: boolean;
  resume?: boolean;
}

export interface DAOProcessingOptions {
  startBlock?: number;
  endBlock?: number;
  includeTransactions?: boolean;
  includeEvents?: boolean;
  resume?: boolean;
}

export interface EventQueryOptions {
  fromBlock: BlockNumber;
  toBlock: BlockNumber;
  pageSize?: number;
  pageKey?: string;
}

export interface ContractCallOptions {
  blockNumber?: BlockNumber;
  from?: Address;
}

export interface DAOContractMetadata {
  address: Address;
  type: 'governor' | 'token' | 'treasury';
  name?: string;
  startBlock?: BlockNumber;
  implementation?: string; // For proxy contracts
}

export interface IDAOProvider {
  // Governance Events
  getProposals(
    governorAddress: Address,
    options: EventQueryOptions
  ): Promise<Proposal[]>;

  getVotes(
    governorAddress: Address,
    proposalId: BigIntString,
    options: EventQueryOptions
  ): Promise<Vote[]>;

  getProposalCreatedEvents(
    governorAddress: Address,
    options: EventQueryOptions
  ): Promise<Proposal[]>;

  getProposalExecutedEvents(
    governorAddress: Address,
    options: EventQueryOptions
  ): Promise<{ proposalId: BigIntString; executedAt: number }[]>;

  getProposalCanceledEvents(
    governorAddress: Address,
    options: EventQueryOptions
  ): Promise<{ proposalId: BigIntString; canceledAt: number }[]>;

  // Token Events and State
  getTokenHolderBalances(
    tokenAddress: Address,
    options: EventQueryOptions
  ): Promise<Map<Address, BigIntString>>;

  getDelegationEvents(
    tokenAddress: Address,
    options: EventQueryOptions
  ): Promise<{ delegator: Address; fromDelegate: Address; toDelegate: Address; blockNumber: BlockNumber }[]>;

  // Treasury Events
  getTreasuryActions(
    treasuryAddress: Address,
    options: EventQueryOptions
  ): Promise<TreasuryAction[]>;

  // Contract State Queries
  getGovernanceState(
    governorAddress: Address,
    options?: ContractCallOptions
  ): Promise<GovernanceState>;

  getTokenInfo(
    tokenAddress: Address,
    options?: ContractCallOptions
  ): Promise<{
    totalSupply: BigIntString;
    name: string;
    symbol: string;
    decimals: number;
  }>;

  // Utility Methods
  validateContract(
    address: Address,
    type: DAOContractMetadata['type']
  ): Promise<boolean>;

  getContractCreationBlock(address: Address): Promise<BlockNumber>;
}