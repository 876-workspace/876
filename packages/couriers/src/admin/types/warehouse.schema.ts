import { z } from 'zod'

const addressSchema = z.object({
  object: z.literal('address'),
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  regionCode: z.string().nullable(),
  regionName: z.string().nullable(),
  countryCode: z.string(),
  postalCode: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
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
  countryCode: z.string(),
  regionCode: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isActive: z.boolean().optional(),
})

const addressUpdateBodySchema = z.strictObject({
  name: z.string().optional(),
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  countryCode: z.string().optional(),
  regionCode: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isActive: z.boolean().optional(),
})

export const warehouseSchema = z.object({
  object: z.literal('warehouse'),
  id: z.string(),
  tenantId: z.string(),
  addressId: z.string(),
  orgLocationId: z.string().nullable(),
  name: z.string(),
  operatingModel: operatingModelSchema,
  agentName: z.string().nullable(),
  code: z.string().nullable(),
  mailboxPlacement: mailboxPlacementSchema,
  mailboxPrefix: z.string().nullable(),
  instructions: z.string().nullable(),
  isActive: z.boolean(),
  isPrimary: z.boolean(),
  address: addressSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const warehouseListSchema = z.object({
  object: z.literal('list'),
  data: z.array(warehouseSchema),
  hasMore: z.boolean(),
  totalCount: z.number().int().nullable(),
  url: z.string(),
})

export const createWarehouseBodySchema = z.strictObject({
  name: z.string(),
  operatingModel: operatingModelSchema.optional(),
  agentName: z.string().optional(),
  code: z.string().optional(),
  mailboxPlacement: mailboxPlacementSchema.optional(),
  mailboxPrefix: z.string().optional(),
  instructions: z.string().optional(),
  isActive: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
  address: addressCreateBodySchema,
})

export const updateWarehouseBodySchema = z.strictObject({
  name: z.string().optional(),
  operatingModel: operatingModelSchema.optional(),
  agentName: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  mailboxPlacement: mailboxPlacementSchema.optional(),
  mailboxPrefix: z.string().nullable().optional(),
  instructions: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
  address: addressUpdateBodySchema.optional(),
})

export type Warehouse = z.infer<typeof warehouseSchema>
export type WarehouseList = z.infer<typeof warehouseListSchema>
export type CreateWarehouseBody = z.input<typeof createWarehouseBodySchema>
export type UpdateWarehouseBody = z.input<typeof updateWarehouseBodySchema>
