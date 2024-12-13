// src/infrastructure/providers/alchemy/abis/index.ts
export const GovernorBravoABI = [
    // Events
    "event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)",
    "event ProposalExecuted(uint256 id)",
    "event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 votes, string reason)",
    "event ProposalCanceled(uint256 id)",
    "event ProposalQueued(uint256 id, uint256 eta)",
    
    // View Functions
    "function proposalCount() external view returns (uint256)",
    "function proposals(uint256) external view returns (uint256 id, address proposer, uint256 eta, uint256 startBlock, uint256 endBlock, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, bool canceled, bool executed)",
    "function state(uint256 proposalId) external view returns (uint8)",
    "function quorumVotes() external view returns (uint256)",
    "function proposalThreshold() external view returns (uint256)",
    "function votingDelay() external view returns (uint256)",
    "function votingPeriod() external view returns (uint256)",
    "function getReceipt(uint256 proposalId, address voter) external view returns (bool hasVoted, uint8 support, uint256 votes)"
];

export const GovernanceTokenABI = [
    // Events
    "event Transfer(address indexed from, address indexed to, uint256 amount)",
    "event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate)",
    "event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance)",
    
    // View Functions
    "function balanceOf(address account) external view returns (uint256)",
    "function delegates(address account) external view returns (address)",
    "function getVotes(address account) external view returns (uint256)",
    "function totalSupply() external view returns (uint256)",
    "function checkpoints(address account, uint32 pos) external view returns (uint32 fromBlock, uint256 votes)",
    "function numCheckpoints(address account) external view returns (uint32)"
];