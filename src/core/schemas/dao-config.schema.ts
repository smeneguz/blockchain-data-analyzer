// src/core/schemas/dao-config.schema.ts
import { z } from 'zod';

export const DAOContractSchema = z.object({
  address: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
  type: z.enum(['governor', 'token', 'treasury', 'tokenlock']),
  name: z.string().optional(),
  startBlock: z.number().int().positive().optional()
});

export const DAOConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  network: z.enum(['mainnet', 'goerli', 'sepolia']),
  contracts: z.array(DAOContractSchema)
    .min(1, 'At least one contract must be specified')
    .refine(
      contracts => contracts.some(c => c.type === 'governor'),
      'At least one governor contract must be specified'
    )
});

export type DAOConfig = z.infer<typeof DAOConfigSchema>;
export type DAOContract = z.infer<typeof DAOContractSchema>;