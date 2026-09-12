import { z } from 'zod'

import type {
  BankDirectoryBank,
  BankDirectoryBranch,
  BankDirectoryBankList,
  BankDirectoryBranchList,
} from './bank-directory'
import { listSchema } from './common.schema'

export const BankDirectoryBankSchema = z.strictObject({
  object: z.literal('bank-directory-bank'),
  id: z.string(),
  countryCode: z.string().length(2),
  name: z.string(),
  shortName: z.string().nullable(),
  bankCode: z.string(),
  clearingSystem: z.string().nullable(),
  institutionType: z.string(),
  logoUrl: z.string().nullable(),
}) satisfies z.ZodType<BankDirectoryBank>

export const BankDirectoryBranchSchema = z.strictObject({
  object: z.literal('bank-directory-branch'),
  id: z.string(),
  bankId: z.string(),
  name: z.string(),
  transitNumber: z.string(),
  routingNumber: z.string().nullable(),
}) satisfies z.ZodType<BankDirectoryBranch>

export const BankDirectoryBankListSchema = listSchema(
  BankDirectoryBankSchema
) satisfies z.ZodType<BankDirectoryBankList>

export const BankDirectoryBranchListSchema = listSchema(
  BankDirectoryBranchSchema
) satisfies z.ZodType<BankDirectoryBranchList>
