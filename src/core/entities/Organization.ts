// src/core/entities/Organization.ts
export interface Organization {
  name: string;
  address: string;
  chainId: number;
  dateAdded: string;
  // Optional fields for both Etherscan and DAO data
  description?: string;
  network?: string;
  lastUpdated?: string;
  contracts?: Array<{
    address: string;
    type: string;
    name?: string;
    startBlock?: number;
  }>;
}