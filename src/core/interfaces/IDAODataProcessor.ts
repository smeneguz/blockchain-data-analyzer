import { Organization } from '../entities/Organization';

export interface ProcessorOptions {
  startBlock?: BlockNumber;
  endBlock?: BlockNumber;
  includeTokenHolders?: boolean;
  includeVotes?: boolean;
  includeTreasuryActions?: boolean;
}

export interface IDAODataProcessor {
  processDAO(
    organization: Organization,
    options?: ProcessorOptions
  ): Promise<void>;

  updateDAOState(
    organization: Organization,
    options?: ProcessorOptions
  ): Promise<void>;
}