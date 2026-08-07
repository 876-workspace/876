/**
 * Financial directory contracts — banks, their branches and accounts, credit
 * unions and their branches.
 *
 * Ported from `domains/directory/schemas/financial.py`. Wire fields stay
 * `snake_case`; request bodies are strict, matching Pydantic's default rejection
 * of unknown fields on these models.
 */

import { z } from 'zod'

import {
  directoryAddressCreateSchema,
  directoryAddressSchema,
  directoryAddressUpdateSchema,
} from './directory.schemas'

export const bankSchema = z
  .object({
    object: z.literal('bank'),
    id: z.string(),
    name: z.string(),
    short_name: z.string().nullable(),
    bank_code: z.string(),
    swift_code: z.string().nullable(),
    logo_url: z.string().nullable(),
    head_office: z.string().nullable(),
    website: z.string().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'Bank', description: 'A bank in the financial directory.' })

export type Bank = z.infer<typeof bankSchema>

export const bankCreateSchema = z.strictObject({
  name: z.string().min(1),
  short_name: z.string().nullish(),
  bank_code: z.string().min(1),
  swift_code: z.string().nullish(),
  logo_url: z.string().nullish(),
  head_office: z.string().nullish(),
  website: z.string().nullish(),
})

export type BankCreate = z.infer<typeof bankCreateSchema>

export const bankUpdateSchema = z.strictObject({
  name: z.string().nullish(),
  short_name: z.string().nullish(),
  bank_code: z.string().nullish(),
  swift_code: z.string().nullish(),
  logo_url: z.string().nullish(),
  head_office: z.string().nullish(),
  website: z.string().nullish(),
})

export type BankUpdate = z.infer<typeof bankUpdateSchema>

export const bankBranchSchema = z
  .object({
    object: z.literal('bank_branch'),
    id: z.string(),
    bank_id: z.string(),
    name: z.string(),
    transit_number: z.string(),
    routing_number: z.string().nullable(),
    address_id: z.string(),
    contact_number: z.string().nullable(),
    operating_hours: z.string().nullable(),
    address: directoryAddressSchema,
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'BankBranch', description: 'A branch of a bank.' })

export type BankBranch = z.infer<typeof bankBranchSchema>

export const bankBranchCreateSchema = z.strictObject({
  name: z.string().min(1),
  transit_number: z.string().min(1),
  routing_number: z.string().nullish(),
  contact_number: z.string().nullish(),
  operating_hours: z.string().nullish(),
  address: directoryAddressCreateSchema,
})

export type BankBranchCreate = z.infer<typeof bankBranchCreateSchema>

export const bankBranchUpdateSchema = z.strictObject({
  name: z.string().nullish(),
  transit_number: z.string().nullish(),
  routing_number: z.string().nullish(),
  contact_number: z.string().nullish(),
  operating_hours: z.string().nullish(),
  address: directoryAddressUpdateSchema.nullish(),
})

export type BankBranchUpdate = z.infer<typeof bankBranchUpdateSchema>

export const bankAccountSchema = z
  .object({
    object: z.literal('bank_account'),
    id: z.string(),
    account_holder: z.string(),
    bank_id: z.string(),
    branch_id: z.string().nullable(),
    account_number: z.string(),
    account_type: z.string(),
    currency: z.string(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({
    id: 'BankAccount',
    description: 'A bank account held at a bank in the directory.',
  })

export type BankAccount = z.infer<typeof bankAccountSchema>

export const bankAccountCreateSchema = z.strictObject({
  account_holder: z.string().min(1),
  bank_id: z.string().min(1),
  branch_id: z.string().nullish(),
  account_number: z.string().min(1),
  account_type: z.string().default('savings'),
  currency: z.string().length(3).default('JMD'),
})

export type BankAccountCreate = z.infer<typeof bankAccountCreateSchema>

export const bankAccountUpdateSchema = z.strictObject({
  account_holder: z.string().nullish(),
  bank_id: z.string().nullish(),
  branch_id: z.string().nullish(),
  account_number: z.string().nullish(),
  account_type: z.string().nullish(),
  currency: z.string().length(3).nullish(),
})

export type BankAccountUpdate = z.infer<typeof bankAccountUpdateSchema>

export const creditUnionSchema = z
  .object({
    object: z.literal('credit_union'),
    id: z.string(),
    name: z.string(),
    short_name: z.string().nullable(),
    logo_url: z.string().nullable(),
    headquarters: z.string().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'CreditUnion', description: 'A credit union.' })

export type CreditUnion = z.infer<typeof creditUnionSchema>

export const creditUnionCreateSchema = z.strictObject({
  name: z.string().min(1),
  short_name: z.string().nullish(),
  logo_url: z.string().nullish(),
  headquarters: z.string().nullish(),
})

export type CreditUnionCreate = z.infer<typeof creditUnionCreateSchema>

export const creditUnionUpdateSchema = z.strictObject({
  name: z.string().nullish(),
  short_name: z.string().nullish(),
  logo_url: z.string().nullish(),
  headquarters: z.string().nullish(),
})

export type CreditUnionUpdate = z.infer<typeof creditUnionUpdateSchema>

export const creditUnionBranchSchema = z
  .object({
    object: z.literal('credit_union_branch'),
    id: z.string(),
    credit_union_id: z.string(),
    name: z.string(),
    address_id: z.string(),
    contact_number: z.string().nullable(),
    email: z.string().nullable(),
    address: directoryAddressSchema,
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({
    id: 'CreditUnionBranch',
    description: 'A branch of a credit union.',
  })

export type CreditUnionBranch = z.infer<typeof creditUnionBranchSchema>

export const creditUnionBranchCreateSchema = z.strictObject({
  name: z.string().min(1),
  contact_number: z.string().nullish(),
  email: z.string().nullish(),
  address: directoryAddressCreateSchema,
})

export type CreditUnionBranchCreate = z.infer<
  typeof creditUnionBranchCreateSchema
>

export const creditUnionBranchUpdateSchema = z.strictObject({
  name: z.string().nullish(),
  contact_number: z.string().nullish(),
  email: z.string().nullish(),
  address: directoryAddressUpdateSchema.nullish(),
})

export type CreditUnionBranchUpdate = z.infer<
  typeof creditUnionBranchUpdateSchema
>
