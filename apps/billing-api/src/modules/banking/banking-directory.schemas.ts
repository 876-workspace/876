import { z } from 'zod'

export const bankingDirectoryBankSchema = z.object({
  object: z.literal('bank-directory-bank'),
  id: z.string(),
  countryCode: z.string().length(2),
  name: z.string(),
  shortName: z.string().nullable(),
  bankCode: z.string(),
  clearingSystem: z.string().nullable(),
  institutionType: z.string(),
  logoUrl: z.string().nullable(),
})

export const bankingDirectoryBranchSchema = z.object({
  object: z.literal('bank-directory-branch'),
  id: z.string(),
  bankId: z.string(),
  name: z.string(),
  transitNumber: z.string(),
  routingNumber: z.string().nullable(),
})

export const bankingDirectoryBanksQuerySchema = z.object({
  countryCode: z.string().trim().length(2).toUpperCase().default('JM'),
  ids: z
    .string()
    .trim()
    .min(1)
    .transform((value) =>
      value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
    .pipe(z.array(z.string()).min(1).max(100))
    .optional(),
})

export const bankingDirectoryBranchesQuerySchema = z.object({
  ids: z
    .string()
    .trim()
    .min(1)
    .transform((value) =>
      value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
    .pipe(z.array(z.string()).min(1).max(100))
    .optional(),
})

export const bankingDirectoryBankParamsSchema = z.object({
  bankId: z.string().min(1),
})
