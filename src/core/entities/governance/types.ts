export type Address = string;
export type BlockNumber = number;
export type Timestamp = number;
export type BigIntString = string; // For large numbers stored as strings

export enum ProposalState {
  Pending = "Pending",
  Active = "Active",
  Canceled = "Canceled",
  Defeated = "Defeated",
  Succeeded = "Succeeded",
  Queued = "Queued",
  Expired = "Expired",
  Executed = "Executed"
}

export enum VoteSupport {
  Against = 0,
  For = 1,
  Abstain = 2
}