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
  .meta({ id: 'WarehouseAddress' })
const addressFields = {
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
  .strictObject(addressFields)
  .refine(coordinatesArePaired.check, coordinatesArePaired)
export const addressUpdateSchema = z
  .strictObject({
    name: addressFields.name.optional(),
    line1: addressFields.line1.optional(),
    line2: addressFields.line2,
    city: addressFields.city.optional(),
    country_code: addressFields.country_code.optional(),
    region_code: addressFields.region_code,
    postal_code: addressFields.postal_code,
    latitude: addressFields.latitude,
    longitude: addressFields.longitude,
    is_active: z.boolean().optional(),
  })
  .refine(coordinatesArePaired.check, coordinatesArePaired)
export const tenantIdParamsSchema = z.strictObject({
  tenantId: z.string().min(1),
})

export const operatingModelSchema = z.enum(['OWNED', 'AGENT'])
export const mailboxPlacementSchema = z.enum([
  'RECIPIENT_LINE',
  'ADDRESS_LINE_1',
  'ADDRESS_LINE_2',
])

const createMailboxPrefix = z
  .string()
  .trim()
  .max(16)
  .transform((value) => (value === '' ? undefined : value.toUpperCase()))
  .refine(
    (value) => value === undefined || /^[A-Z]+$/.test(value),
    'Warehouse mailbox prefix may only contain letters.'
  )
  .optional()
const createCode = z
  .string()
  .trim()
  .max(16)
  .transform((value) => (value === '' ? undefined : value.toUpperCase()))
  .refine(
    (value) => value === undefined || /^[A-Z0-9-]+$/.test(value),
    'Warehouse code may only contain letters, numbers and hyphens.'
  )
  .optional()
const clearable = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .transform((value) => (value === '' ? null : value))
    .optional()
const clearableCode = z
  .union([z.string().trim().max(16), z.null()])
  .transform((value) => (value === '' ? null : value?.toUpperCase()))
  .refine(
    (value) =>
      value === undefined || value === null || /^[A-Z0-9-]+$/.test(value),
    'Warehouse code may only contain letters, numbers and hyphens.'
  )
  .optional()
const clearablePrefix = z
  .union([z.string().trim().max(16), z.null()])
  .transform((value) => (value === '' ? null : value?.toUpperCase()))
  .refine(
    (value) => value === undefined || value === null || /^[A-Z]+$/.test(value),
    'Warehouse mailbox prefix may only contain letters.'
  )
  .optional()

export const warehouseSchema = z
  .object({
    object: z.literal('warehouse'),
    id: z.string(),
    tenant_id: z.string(),
    address_id: z.string(),
    org_location_id: z.string().nullable(),
    name: z.string(),
    operating_model: operatingModelSchema,
    agent_name: z.string().nullable(),
    code: z.string().nullable(),
    mailbox_placement: mailboxPlacementSchema,
    mailbox_prefix: z.string().nullable(),
    instructions: z.string().nullable(),
    is_active: z.boolean(),
    is_primary: z.boolean(),
    address: addressSchema,
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'Warehouse' })

export const createWarehouseBodySchema = z.strictObject({
  name: z.string().trim().min(1),
  operating_model: operatingModelSchema.optional(),
  agent_name: z.string().trim().max(120).optional(),
  code: createCode,
  mailbox_placement: mailboxPlacementSchema.optional(),
  mailbox_prefix: createMailboxPrefix,
  instructions: z.string().trim().max(500).optional(),
  is_active: z.boolean().optional(),
  is_primary: z.boolean().optional(),
  address: addressCreateSchema,
})
export type CreateWarehouseBody = z.infer<typeof createWarehouseBodySchema>

export const updateWarehouseBodySchema = z.strictObject({
  name: z.string().trim().min(1).optional(),
  operating_model: operatingModelSchema.optional(),
  agent_name: clearable(120),
  code: clearableCode,
  mailbox_placement: mailboxPlacementSchema.optional(),
  mailbox_prefix: clearablePrefix,
  instructions: clearable(500),
  is_active: z.boolean().optional(),
  is_primary: z.boolean().optional(),
  address: addressUpdateSchema.optional(),
})
export type UpdateWarehouseBody = z.infer<typeof updateWarehouseBodySchema>

export const warehouseParamsSchema = tenantIdParamsSchema.extend({
  id: z.string().min(1),
})
export type WarehouseParams = z.infer<typeof warehouseParamsSchema>
export type TenantIdParams = z.infer<typeof tenantIdParamsSchema>
export type Warehouse = z.infer<typeof warehouseSchema>
