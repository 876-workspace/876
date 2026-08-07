import { z } from 'zod'

/**
 * Addresses owned by a user or an organization — never both.
 *
 * The request contract is camelCase here, unlike the rest of the platform: the
 * FastAPI schemas carry `alias="userId"` with `populate_by_name`, so both spellings
 * are accepted on input and clients in production send the camelCase one. The
 * response stays snake_case, as it always was.
 */

export const ADDRESS_TYPES = [
  'billing',
  'shipping',
  'home',
  'work',
  'other',
] as const

export const addressSchema = z
  .object({
    object: z.literal('address').meta({ description: "Always 'address'." }),
    id: z.string(),
    user_id: z.string().nullable(),
    organization_id: z.string().nullable(),
    type: z.enum(ADDRESS_TYPES),
    label: z.string().nullable(),
    line1: z.string().nullable(),
    line2: z.string().nullable(),
    city: z.string().nullable(),
    region_id: z.string().nullable(),
    country_code: z.string().nullable(),
    postal_code: z.string().nullable(),
    is_default: z.boolean(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'Address' })

export const addressDeletedSchema = z
  .object({
    object: z.literal('address'),
    id: z.string(),
    deleted: z.literal(true),
  })
  .meta({ id: 'AddressDeleted' })

/** Accepts either spelling of every aliased field, as Pydantic did. */
const either = <T extends z.ZodTypeAny>(schema: T) => schema.optional()

export const createAddressBodySchema = z
  .object({
    userId: either(z.string()),
    user_id: either(z.string()),
    organizationId: either(z.string()),
    organization_id: either(z.string()),
    type: z.enum(ADDRESS_TYPES).default('other'),
    label: either(z.string()),
    line1: either(z.string()),
    line2: either(z.string()),
    city: either(z.string()),
    regionId: either(z.string()),
    region_id: either(z.string()),
    countryCode: either(z.string()),
    country_code: either(z.string()),
    postalCode: either(z.string()),
    postal_code: either(z.string()),
    isDefault: either(z.boolean()),
    is_default: either(z.boolean()),
  })
  .transform((body) => ({
    userId: body.userId ?? body.user_id ?? null,
    organizationId: body.organizationId ?? body.organization_id ?? null,
    type: body.type,
    label: body.label ?? null,
    line1: body.line1 ?? null,
    line2: body.line2 ?? null,
    city: body.city ?? null,
    regionId: body.regionId ?? body.region_id ?? null,
    countryCode: body.countryCode ?? body.country_code ?? null,
    postalCode: body.postalCode ?? body.postal_code ?? null,
    isDefault: body.isDefault ?? body.is_default ?? false,
  }))

/**
 * Every field optional — an update applies only what was sent. A field set to
 * null is ignored rather than clearing the column, matching `exclude_none`.
 */
export const updateAddressBodySchema = z
  .object({
    type: z.enum(ADDRESS_TYPES).optional(),
    label: z.string().nullish(),
    line1: z.string().nullish(),
    line2: z.string().nullish(),
    city: z.string().nullish(),
    regionId: z.string().nullish(),
    region_id: z.string().nullish(),
    countryCode: z.string().nullish(),
    country_code: z.string().nullish(),
    postalCode: z.string().nullish(),
    postal_code: z.string().nullish(),
    isDefault: z.boolean().nullish(),
    is_default: z.boolean().nullish(),
  })
  .transform((body) => ({
    type: body.type,
    label: body.label ?? undefined,
    line1: body.line1 ?? undefined,
    line2: body.line2 ?? undefined,
    city: body.city ?? undefined,
    regionId: body.regionId ?? body.region_id ?? undefined,
    countryCode: body.countryCode ?? body.country_code ?? undefined,
    postalCode: body.postalCode ?? body.postal_code ?? undefined,
    isDefault: body.isDefault ?? body.is_default ?? undefined,
  }))

export const listAddressesQuerySchema = z.object({
  userId: z.string().optional(),
  organizationId: z.string().optional(),
})

export const addressIdParamsSchema = z.strictObject({ address_id: z.string() })

export type Address = z.infer<typeof addressSchema>
export type AddressType = (typeof ADDRESS_TYPES)[number]
export type CreateAddressBody = z.output<typeof createAddressBodySchema>
export type UpdateAddressBody = z.output<typeof updateAddressBodySchema>
export type ListAddressesQuery = z.infer<typeof listAddressesQuerySchema>
