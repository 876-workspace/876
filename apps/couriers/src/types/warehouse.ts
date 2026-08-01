import * as z from 'zod'

import {
  addressCreateParamsSchema,
  addressUpdateParamsSchema,
  addressViewSchema,
} from './address'

/**
 * A warehouse is an operational entity that has an address, not an address
 * itself. Receiving, consolidation and manifest behaviour belong to the
 * warehouse; branch concerns (default pickup, staff, routing) never do.
 */
export const warehouseViewSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  addressId: z.string(),
  orgLocationId: z.string().nullable(),
  name: z.string(),
  isPrimary: z.boolean(),
  address: addressViewSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type WarehouseView = z.infer<typeof warehouseViewSchema>

export const warehouseCreateParamsSchema = z.strictObject({
  name: z.string().trim().min(1),
  isPrimary: z.boolean().optional(),
  address: addressCreateParamsSchema,
})
export type WarehouseCreateParams = z.input<typeof warehouseCreateParamsSchema>

/** `tenantId`, `addressId`, and `orgLocationId` are never client-controlled. */
export const warehouseUpdateParamsSchema = z.strictObject({
  name: z.string().trim().min(1).optional(),
  isPrimary: z.boolean().optional(),
  address: addressUpdateParamsSchema.optional(),
})
export type WarehouseUpdateParams = z.input<typeof warehouseUpdateParamsSchema>

export interface WarehouseListParams {
  tenantId: string
}
