import { Organization, Transaction, TokenTransfer } from '../entities';
import { StorageState } from '../../infrastructure/persistence/FileSystemStorage';

export interface IDataStorage {
    saveOrganization(organization: Organization): Promise<void>;
    getOrganization(address: string): Promise<Organization | null>;
    saveTransactions(organizationName: string, transactions: Transaction[], type: string): Promise<void>;
    saveTokenTransfers(organizationName: string, transfers: TokenTransfer[]): Promise<void>;
    getLastProcessedState(name: string): Promise<StorageState | null>;
}