/**
 * Shared directory contracts: the query/param shapes every resource uses, and
 * the nested `directory_address` object five of them embed.
 *
 * Ported from `domains/directory/schemas/address.py` plus the query parameters
 * declared inline on each FastAPI route. The per-group resource contracts live
 * beside this file in `financial.schemas.ts`, `government.schemas.ts`, and
 * `education.schemas.ts`, mirroring how the Python `schemas/` package is split.
 */

import { z } from 'zod'

import { deletedObjectSchema, paginationQuerySchema } from '@/http/envelope'

/**
 * The read query every list route accepts.
 *
 * `include_deleted` is declared here but is **privilege-gated in the service**:
 * a caller holding only an app API key never sees a tombstoned row, whatever it
 * asks for. The FastAPI routes do `include_deleted if principal.internal else
 * False`, and that gate is reproduced rather than trusted to the schema.
 */
/**
 * A boolean that arrives as a query string.
 *
 * Deliberately not `z.coerce.boolean()`: that is `Boolean(value)`, so the string
 * `'false'` — non-empty — coerces to **true**, and `?include_deleted=false`
 * would ask for exactly what it says it does not want. Only the recognised true
 * spellings are true; anything else is false.
 */
const booleanQueryParam = z
  .union([
    z.boolean(),
    z
      .string()
      .transform((value) => ['true', '1', 'yes'].includes(value.toLowerCase())),
  ])
  .default(false)

export const listDirectoryQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  include_deleted: booleanQueryParam,
})

export type ListDirectoryQuery = z.infer<typeof listDirectoryQuerySchema>

/** The read query for a single record, which is also privilege-gated. */
export const retrieveDirectoryQuerySchema = z.object({
  include_deleted: booleanQueryParam,
})

export type RetrieveDirectoryQuery = z.infer<
  typeof retrieveDirectoryQuerySchema
>

export const bankIdParamsSchema = z.strictObject({ bank_id: z.string() })
export const branchIdParamsSchema = z.strictObject({ branch_id: z.string() })
export const accountIdParamsSchema = z.strictObject({ account_id: z.string() })
export const creditUnionIdParamsSchema = z.strictObject({
  credit_union_id: z.string(),
})
export const ministryIdParamsSchema = z.strictObject({
  ministry_id: z.string(),
})
export const departmentIdParamsSchema = z.strictObject({
  department_id: z.string(),
})
export const schoolIdParamsSchema = z.strictObject({ school_id: z.string() })
export const universityIdParamsSchema = z.strictObject({
  university_id: z.string(),
})
export const campusIdParamsSchema = z.strictObject({ campus_id: z.string() })

/** A physical address attached to a branch, department, school, or campus. */
export const directoryAddressSchema = z
  .object({
    object: z.literal('directory_address'),
    id: z.string(),
    line1: z.string(),
    line2: z.string().nullable(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string().nullable(),
    country: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({
    id: 'DirectoryAddress',
    description: 'A physical address belonging to a directory record.',
  })

export type DirectoryAddress = z.infer<typeof directoryAddressSchema>

export const directoryAddressCreateSchema = z.strictObject({
  line1: z.string().min(1),
  line2: z.string().nullish(),
  city: z.string().min(1),
  state: z.string().min(1),
  postal_code: z.string().nullish(),
  country: z.string().length(2).default('JM'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

export type DirectoryAddressCreate = z.infer<
  typeof directoryAddressCreateSchema
>

export const directoryAddressUpdateSchema = z.strictObject({
  line1: z.string().nullish(),
  line2: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  postal_code: z.string().nullish(),
  country: z.string().length(2).nullish(),
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),
})

export type DirectoryAddressUpdate = z.infer<
  typeof directoryAddressUpdateSchema
>

export const bankDeletedSchema = deletedObjectSchema('bank')
export const bankBranchDeletedSchema = deletedObjectSchema('bank_branch')
export const bankAccountDeletedSchema = deletedObjectSchema('bank_account')
export const creditUnionDeletedSchema = deletedObjectSchema('credit_union')
export const creditUnionBranchDeletedSchema = deletedObjectSchema(
  'credit_union_branch'
)
export const ministryDeletedSchema = deletedObjectSchema('ministry')
export const ministryDepartmentDeletedSchema = deletedObjectSchema(
  'ministry_department'
)
export const secondarySchoolDeletedSchema =
  deletedObjectSchema('secondary_school')
export const universityDeletedSchema = deletedObjectSchema('university')
export const universityCampusDeletedSchema =
  deletedObjectSchema('university_campus')
