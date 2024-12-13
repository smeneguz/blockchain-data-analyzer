// src/core/entities/Transaction.ts
export interface Transaction {
  hash: string;
  blockNumber: number;
  timeStamp: number;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  methodId: string;
  functionName: string;
  isInternal?: boolean;  // Add this property
  gasUsed?: string;      // Add this property
  status?: string;       // Add this property
}