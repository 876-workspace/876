import * as z from 'zod'

export const warehouseViewSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  street1: z.string(),
  street2: z.string().nullable(),
  city: z.string(),
  state: z.string().nullable(),
  country: z.string(),
  postalCode: z.string().nullable(),
  isPrimary: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type WarehouseView = z.infer<typeof warehouseViewSchema>

export const warehouseCreateParamsSchema = z.strictObject({
  name: z.string().min(1),
  street1: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  isPrimary: z.boolean().optional(),
})
export type WarehouseCreateParams = z.input<typeof warehouseCreateParamsSchema>

export const warehouseUpdateParamsSchema = z.strictObject({
  name: z.string().min(1).optional(),
  street1: z.string().min(1).optional(),
  street2: z.string().optional(),
  city: z.string().min(1).optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  isPrimary: z.boolean().optional(),
})
export type WarehouseUpdateParams = z.input<typeof warehouseUpdateParamsSchema>

export const warehouseRetrieveParamsSchema = z.strictObject({
  id: z.string(),
})
export type WarehouseRetrieveParams = z.input<
  typeof warehouseRetrieveParamsSchema
>

export const warehouseListParamsSchema = z.strictObject({
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
})
export type WarehouseListParams = z.input<typeof warehouseListParamsSchema>

export const deletedWarehouseSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedWarehouse = z.infer<typeof deletedWarehouseSchema>
