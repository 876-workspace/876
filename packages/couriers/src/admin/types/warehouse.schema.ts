import { z } from 'zod'

const addressSchema = z.object({
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

const operatingModelSchema = z.enum(['OWNED', 'AGENT'])
const mailboxPlacementSchema = z.enum([
  'RECIPIENT_LINE',
  'ADDRESS_LINE_1',
  'ADDRESS_LINE_2',
])

const addressCreateBodySchema = z.strictObject({
  name: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  country_code: z.string(),
  region_code: z.string().optional(),
  postal_code: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  is_active: z.boolean().optional(),
})

const addressUpdateBodySchema = z.strictObject({
  name: z.string().optional(),
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  country_code: z.string().optional(),
  region_code: z.string().optional(),
  postal_code: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  is_active: z.boolean().optional(),
})

export const warehouseSchema = z.object({
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

export const warehouseListSchema = z.object({
  object: z.literal('list'),
  data: z.array(warehouseSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export const createWarehouseBodySchema = z.strictObject({
  name: z.string(),
  operating_model: operatingModelSchema.optional(),
  agent_name: z.string().optional(),
  code: z.string().optional(),
  mailbox_placement: mailboxPlacementSchema.optional(),
  mailbox_prefix: z.string().optional(),
  instructions: z.string().optional(),
  is_active: z.boolean().optional(),
  is_primary: z.boolean().optional(),
  address: addressCreateBodySchema,
})

export const updateWarehouseBodySchema = z.strictObject({
  name: z.string().optional(),
  operating_model: operatingModelSchema.optional(),
  agent_name: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  mailbox_placement: mailboxPlacementSchema.optional(),
  mailbox_prefix: z.string().nullable().optional(),
  instructions: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  is_primary: z.boolean().optional(),
  address: addressUpdateBodySchema.optional(),
})

export type Warehouse = z.infer<typeof warehouseSchema>
export type WarehouseList = z.infer<typeof warehouseListSchema>
export type CreateWarehouseBody = z.input<typeof createWarehouseBodySchema>
export type UpdateWarehouseBody = z.input<typeof updateWarehouseBodySchema>
