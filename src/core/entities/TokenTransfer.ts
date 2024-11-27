export interface TokenTransfer {
    blockNumber: number;
    timeStamp: number;
    hash: string;
    from: string;
    to: string;
    value: string;
    contractAddress: string;
    tokenName: string;
    tokenSymbol: string;
    tokenDecimal: string;
    transactionIndex: number;
    gas: string;
    gasPrice: string;
    gasUsed: string;
  }