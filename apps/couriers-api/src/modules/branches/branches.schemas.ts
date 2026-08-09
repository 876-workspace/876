import { z } from 'zod'

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? undefined : value))
    .optional()

const coordinatesArePaired = {
  check: (data: { latitude?: number; longitude?: number }) =>
    (data.latitude === undefined) === (data.longitude === undefined),
  message: 'Provide both a latitude and a longitude, or neither.',
  path: ['latitude'],
}

export const addressSchema = z
  .object({
    object: z.literal('address'),
    id: z.string(),
    tenant_id: z.string(),
    name: z.string(),
    line1: z.string(),
    line2: z.string().nullable(),
    city: z.string(),
    region_code: z.string().nullable(),
    region_name: z.string().nullable(),
    country_code: z.string(),
    postal_code: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    is_active: z.boolean(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'Address' })

export const branchSchema = z
  .object({
    object: z.literal('branch'),
    id: z.string(),
    tenant_id: z.string(),
    address_id: z.string(),
    org_location_id: z.string().nullable(),
    name: z.string(),
    phone: z.string().nullable(),
    is_default: z.boolean(),
    is_active: z.boolean(),
    settings: z.record(z.string(), z.unknown()).nullable(),
    address: addressSchema,
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'Branch' })

const addressCreateFields = {
  name: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(200),
  line2: optionalText(200),
  city: z.string().trim().min(1).max(120),
  country_code: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toUpperCase()),
  region_code: z
    .string()
    .trim()
    .max(32)
    .transform((value) => (value === '' ? undefined : value.toUpperCase()))
    .optional(),
  postal_code: optionalText(32),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  is_active: z.boolean().optional(),
}

export const addressCreateSchema = z
  .strictObject(addressCreateFields)
  .refine(coordinatesArePaired.check, coordinatesArePaired)

export const addressUpdateSchema = z
  .strictObject({
    name: addressCreateFields.name.optional(),
    line1: addressCreateFields.line1.optional(),
    line2: addressCreateFields.line2,
    city: addressCreateFields.city.optional(),
    country_code: addressCreateFields.country_code.optional(),
    region_code: addressCreateFields.region_code,
    postal_code: addressCreateFields.postal_code,
    latitude: addressCreateFields.latitude,
    longitude: addressCreateFields.longitude,
    is_active: z.boolean().optional(),
  })
  .refine(coordinatesArePaired.check, coordinatesArePaired)

export const createBranchBodySchema = z.strictObject({
  name: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  address: addressCreateSchema,
})
export type CreateBranchBody = z.infer<typeof createBranchBodySchema>

export const updateBranchBodySchema = z.strictObject({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().nullable().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  address: addressUpdateSchema.optional(),
})
export type UpdateBranchBody = z.infer<typeof updateBranchBodySchema>

export const tenantIdParamsSchema = z.strictObject({
  tenantId: z.string().min(1),
})
export type TenantIdParams = z.infer<typeof tenantIdParamsSchema>

export const branchParamsSchema = tenantIdParamsSchema.extend({
  id: z.string().min(1),
})
export type BranchParams = z.infer<typeof branchParamsSchema>

export const listBranchesQuerySchema = z
  .strictObject({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    starting_after: z.string().min(1).optional(),
    ending_before: z.string().min(1).optional(),
    is_active: z.coerce.boolean().optional(),
  })
  .refine((query) => !(query.starting_after && query.ending_before), {
    message: 'Only one cursor may be provided.',
  })
export type ListBranchesQuery = z.infer<typeof listBranchesQuerySchema>

export type Address = z.infer<typeof addressSchema>
export type Branch = z.infer<typeof branchSchema>
