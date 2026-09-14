/**
 * Financial directory contracts — banks, their branches and accounts, credit
 * unions and their branches.
 *
 * Wire fields stay `snake_case`. Banks are country-scoped reference data: local
 * institution and routing codes are meaningful inside a country's clearing
 * system, not as globally unique identifiers.
 */

import { z } from 'zod'

import {
  BANK_BRANCH_TYPES,
  CREDIT_UNION_BRANCH_TYPES,
  LOCATION_STATUSES,
} from '@/platform/financial-directory-vocabulary'

import {
  directoryAddressCreateSchema,
  directoryAddressSchema,
  directoryAddressUpdateSchema,
  listDirectoryQuerySchema,
} from './directory.schemas'

const countryCodeSchema = z.string().trim().length(2).toUpperCase()

/**
 * Batch selector for page-wide enrichment (see data-loading.md: one call per
 * kind, never one request per row). Comma-separated on the wire, matching the
 * existing `user_ids` convention; capped at 100 like the users list.
 */
const idsQueryParam = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  )
  .pipe(z.array(z.string()).max(100))
  .optional()

export const bankListQuerySchema = listDirectoryQuerySchema.extend({
  country_code: countryCodeSchema.optional(),
  ids: idsQueryParam,
})

export type BankListQuery = z.infer<typeof bankListQuerySchema>

export const bankBranchListQuerySchema = listDirectoryQuerySchema.extend({
  ids: idsQueryParam,
})

export type BankBranchListQuery = z.infer<typeof bankBranchListQuerySchema>

export const bankBranchBatchQuerySchema = listDirectoryQuerySchema.extend({
  bank_id: z.string().min(1).optional(),
  ids: idsQueryParam,
})

export type BankBranchBatchQuery = z.infer<typeof bankBranchBatchQuerySchema>

/**
 * Public contact and provenance values captured from an official source.
 * `source_as_of` is the source's own `YYYY-MM-DD` publication date;
 * `last_verified_at` is the Unix second a human verified the record.
 */
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')

export const bankSchema = z
  .object({
    object: z.literal('bank'),
    id: z.string(),
    country_code: countryCodeSchema,
    name: z.string(),
    short_name: z.string().nullable(),
    bank_code: z.string(),
    clearing_system: z.string().nullable(),
    institution_type: z.string(),
    swift_code: z.string().nullable(),
    logo_url: z.string().nullable(),
    head_office: z.string().nullable(),
    website: z.string().nullable(),
    general_phone: z.string().nullable(),
    support_phone: z.string().nullable(),
    support_email: z.string().nullable(),
    complaints_email: z.string().nullable(),
    contact_url: z.string().nullable(),
    source_url: z.string().nullable(),
    source_as_of: z.string().nullable(),
    last_verified_at: z.number().int().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({
    id: 'Bank',
    description: 'A country-scoped bank in the financial directory.',
  })

export type Bank = z.infer<typeof bankSchema>

export const bankCreateSchema = z.strictObject({
  country_code: countryCodeSchema.default('JM'),
  name: z.string().trim().min(1),
  short_name: z.string().trim().min(1).nullish(),
  bank_code: z.string().trim().min(1),
  clearing_system: z.string().trim().min(1).nullish(),
  institution_type: z.string().trim().min(1).default('commercial_bank'),
  swift_code: z.string().trim().min(1).nullish(),
  logo_url: z.string().trim().min(1).nullish(),
  head_office: z.string().trim().min(1).nullish(),
  website: z.string().trim().min(1).nullish(),
  general_phone: z.string().trim().min(1).nullish(),
  support_phone: z.string().trim().min(1).nullish(),
  support_email: z.string().trim().min(1).nullish(),
  complaints_email: z.string().trim().min(1).nullish(),
  contact_url: z.string().trim().min(1).nullish(),
  source_url: z.string().trim().min(1).nullish(),
  source_as_of: isoDateSchema.nullish(),
  last_verified_at: z.number().int().nonnegative().nullish(),
})

export type BankCreate = z.infer<typeof bankCreateSchema>

export const bankUpdateSchema = z.strictObject({
  country_code: countryCodeSchema.optional(),
  name: z.string().trim().min(1).optional(),
  short_name: z.string().trim().min(1).nullable().optional(),
  bank_code: z.string().trim().min(1).optional(),
  clearing_system: z.string().trim().min(1).nullable().optional(),
  institution_type: z.string().trim().min(1).optional(),
  swift_code: z.string().trim().min(1).nullable().optional(),
  logo_url: z.string().trim().min(1).nullable().optional(),
  head_office: z.string().trim().min(1).nullable().optional(),
  website: z.string().trim().min(1).nullable().optional(),
  general_phone: z.string().trim().min(1).nullable().optional(),
  support_phone: z.string().trim().min(1).nullable().optional(),
  support_email: z.string().trim().min(1).nullable().optional(),
  complaints_email: z.string().trim().min(1).nullable().optional(),
  contact_url: z.string().trim().min(1).nullable().optional(),
  source_url: z.string().trim().min(1).nullable().optional(),
  source_as_of: isoDateSchema.nullable().optional(),
  last_verified_at: z.number().int().nonnegative().nullable().optional(),
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
    raw_address: z.string().nullable(),
    address_id: z.string().nullable(),
    contact_number: z.string().nullable(),
    operating_hours: z.string().nullable(),
    branch_type: z.enum(BANK_BRANCH_TYPES).nullable(),
    status: z.enum(LOCATION_STATUSES).nullable(),
    source_url: z.string().nullable(),
    source_as_of: z.string().nullable(),
    last_verified_at: z.number().int().nullable(),
    address: directoryAddressSchema.nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({
    id: 'BankBranch',
    description:
      'A bank branch. Routing reference data may exist before a trusted physical location is available.',
  })

export type BankBranch = z.infer<typeof bankBranchSchema>

export const bankBranchCreateSchema = z.strictObject({
  name: z.string().min(1),
  transit_number: z.string().min(1),
  routing_number: z.string().nullish(),
  raw_address: z.string().nullish(),
  contact_number: z.string().nullish(),
  operating_hours: z.string().nullish(),
  branch_type: z.enum(BANK_BRANCH_TYPES).nullish(),
  status: z.enum(LOCATION_STATUSES).nullish(),
  source_url: z.string().trim().min(1).nullish(),
  source_as_of: isoDateSchema.nullish(),
  last_verified_at: z.number().int().nonnegative().nullish(),
  address: directoryAddressCreateSchema,
})

export type BankBranchCreate = z.infer<typeof bankBranchCreateSchema>

export const bankBranchUpdateSchema = z.strictObject({
  name: z.string().nullish(),
  transit_number: z.string().nullish(),
  routing_number: z.string().nullish(),
  raw_address: z.string().nullish(),
  contact_number: z.string().nullish(),
  operating_hours: z.string().nullish(),
  branch_type: z.enum(BANK_BRANCH_TYPES).nullish(),
  status: z.enum(LOCATION_STATUSES).nullish(),
  source_url: z.string().trim().min(1).nullish(),
  source_as_of: isoDateSchema.nullish(),
  last_verified_at: z.number().int().nonnegative().nullish(),
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
  account_holder: z.string().min(1).optional(),
  bank_id: z.string().min(1).optional(),
  branch_id: z.string().min(1).nullable().optional(),
  account_number: z.string().min(1).optional(),
  account_type: z.string().min(1).optional(),
  currency: z.string().length(3).optional(),
})

export type BankAccountUpdate = z.infer<typeof bankAccountUpdateSchema>

export const creditUnionSchema = z
  .object({
    object: z.literal('credit_union'),
    id: z.string(),
    code: z.string().nullable(),
    name: z.string(),
    short_name: z.string().nullable(),
    logo_url: z.string().nullable(),
    headquarters: z.string().nullable(),
    website: z.string().nullable(),
    general_phone: z.string().nullable(),
    support_phone: z.string().nullable(),
    support_email: z.string().nullable(),
    complaints_email: z.string().nullable(),
    contact_url: z.string().nullable(),
    source_url: z.string().nullable(),
    source_as_of: z.string().nullable(),
    last_verified_at: z.number().int().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'CreditUnion', description: 'A credit union.' })

export type CreditUnion = z.infer<typeof creditUnionSchema>

export const creditUnionCreateSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'must be a lowercase slug')
    .nullish(),
  name: z.string().min(1),
  short_name: z.string().nullish(),
  logo_url: z.string().nullish(),
  headquarters: z.string().nullish(),
  website: z.string().trim().min(1).nullish(),
  general_phone: z.string().trim().min(1).nullish(),
  support_phone: z.string().trim().min(1).nullish(),
  support_email: z.string().trim().min(1).nullish(),
  complaints_email: z.string().trim().min(1).nullish(),
  contact_url: z.string().trim().min(1).nullish(),
  source_url: z.string().trim().min(1).nullish(),
  source_as_of: isoDateSchema.nullish(),
  last_verified_at: z.number().int().nonnegative().nullish(),
})

export type CreditUnionCreate = z.infer<typeof creditUnionCreateSchema>

export const creditUnionUpdateSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'must be a lowercase slug')
    .nullable()
    .optional(),
  name: z.string().nullish(),
  short_name: z.string().nullish(),
  logo_url: z.string().nullish(),
  headquarters: z.string().nullish(),
  website: z.string().trim().min(1).nullable().optional(),
  general_phone: z.string().trim().min(1).nullable().optional(),
  support_phone: z.string().trim().min(1).nullable().optional(),
  support_email: z.string().trim().min(1).nullable().optional(),
  complaints_email: z.string().trim().min(1).nullable().optional(),
  contact_url: z.string().trim().min(1).nullable().optional(),
  source_url: z.string().trim().min(1).nullable().optional(),
  source_as_of: isoDateSchema.nullable().optional(),
  last_verified_at: z.number().int().nonnegative().nullable().optional(),
})

export type CreditUnionUpdate = z.infer<typeof creditUnionUpdateSchema>

export const creditUnionBranchSchema = z
  .object({
    object: z.literal('credit_union_branch'),
    id: z.string(),
    code: z.string().nullable(),
    credit_union_id: z.string(),
    name: z.string(),
    raw_address: z.string().nullable(),
    address_id: z.string().nullable(),
    contact_number: z.string().nullable(),
    email: z.string().nullable(),
    operating_hours: z.string().nullable(),
    branch_type: z.enum(CREDIT_UNION_BRANCH_TYPES).nullable(),
    status: z.enum(LOCATION_STATUSES).nullable(),
    source_url: z.string().nullable(),
    source_as_of: z.string().nullable(),
    last_verified_at: z.number().int().nullable(),
    address: directoryAddressSchema.nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({
    id: 'CreditUnionBranch',
    description: 'A branch of a credit union.',
  })

export type CreditUnionBranch = z.infer<typeof creditUnionBranchSchema>

export const creditUnionBranchCreateSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'must be a lowercase slug')
    .nullish(),
  name: z.string().min(1),
  raw_address: z.string().nullish(),
  contact_number: z.string().nullish(),
  email: z.string().nullish(),
  operating_hours: z.string().nullish(),
  branch_type: z.enum(CREDIT_UNION_BRANCH_TYPES).nullish(),
  status: z.enum(LOCATION_STATUSES).nullish(),
  source_url: z.string().trim().min(1).nullish(),
  source_as_of: isoDateSchema.nullish(),
  last_verified_at: z.number().int().nonnegative().nullish(),
  address: directoryAddressCreateSchema.nullish(),
})

export type CreditUnionBranchCreate = z.infer<
  typeof creditUnionBranchCreateSchema
>

export const creditUnionBranchUpdateSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'must be a lowercase slug')
    .nullable()
    .optional(),
  name: z.string().nullish(),
  raw_address: z.string().nullish(),
  contact_number: z.string().nullish(),
  email: z.string().nullish(),
  operating_hours: z.string().nullish(),
  branch_type: z.enum(CREDIT_UNION_BRANCH_TYPES).nullish(),
  status: z.enum(LOCATION_STATUSES).nullish(),
  source_url: z.string().trim().min(1).nullish(),
  source_as_of: isoDateSchema.nullish(),
  last_verified_at: z.number().int().nonnegative().nullish(),
  address: directoryAddressUpdateSchema.nullish(),
})

export type CreditUnionBranchUpdate = z.infer<
  typeof creditUnionBranchUpdateSchema
>
