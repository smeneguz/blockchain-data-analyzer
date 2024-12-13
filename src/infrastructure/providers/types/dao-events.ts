// src/infrastructure/providers/types/dao-events.ts
import { BigNumber } from 'ethers';
import { EventLog } from '../types';

export interface DAOEventBase {
  address: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  timestamp?: number;
}

export interface ProposalEventData extends DAOEventBase {
  proposalId: BigNumber;
  proposer: string;
  targets: string[];
  values: BigNumber[];
  signatures: string[];
  calldatas: string[];
  startBlock: number;
  endBlock: number;
  description: string;
}

export interface VoteEventData extends DAOEventBase {
  proposalId: BigNumber;
  voter: string;
  support: number;
  weight: BigNumber;
  reason?: string;
}

export interface DelegateEventData extends DAOEventBase {
  delegator: string;
  fromDelegate: string;
  toDelegate: string;
}

export interface TokenTransferEventData extends DAOEventBase {
  from: string;
  to: string;
  amount: BigNumber;
}

export interface ExecuteEventData extends DAOEventBase {
  proposalId: BigNumber;
  targets: string[];
  values: BigNumber[];
  signatures: string[];
  calldatas: string[];
}