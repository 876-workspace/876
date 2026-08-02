import * as z from 'zod'

import {
  addressCreateParamsSchema,
  addressUpdateParamsSchema,
  addressViewSchema,
} from './address'

export const warehouseOperatingModelSchema = z.enum(['OWNED', 'AGENT'])
export type WarehouseOperatingModel = z.infer<
  typeof warehouseOperatingModelSchema
>

export const mailboxPlacementSchema = z.enum([
  'RECIPIENT_LINE',
  'ADDRESS_LINE_1',
  'ADDRESS_LINE_2',
])
export type MailboxPlacement = z.infer<typeof mailboxPlacementSchema>

/** Blank optional input is absence, not an empty value. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? undefined : value))
    .optional()

const optionalWarehouseCode = z
  .string()
  .trim()
  .max(16)
  .transform((value) => (value === '' ? undefined : value.toUpperCase()))
  .refine(
    (value) => value === undefined || /^[A-Z0-9-]+$/.test(value),
    'Warehouse code may only contain letters, numbers and hyphens.'
  )
  .optional()

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
  operatingModel: warehouseOperatingModelSchema,
  agentName: z.string().nullable(),
  code: z.string().nullable(),
  mailboxPlacement: mailboxPlacementSchema,
  mailboxPrefix: z.string().nullable(),
  instructions: z.string().nullable(),
  isActive: z.boolean(),
  isPrimary: z.boolean(),
  address: addressViewSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type WarehouseView = z.infer<typeof warehouseViewSchema>

export const warehouseCreateParamsSchema = z.strictObject({
  name: z.string().trim().min(1),
  operatingModel: warehouseOperatingModelSchema.optional(),
  agentName: optionalText(120),
  code: optionalWarehouseCode,
  mailboxPlacement: mailboxPlacementSchema.optional(),
  mailboxPrefix: optionalText(16),
  instructions: optionalText(500),
  isActive: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
  address: addressCreateParamsSchema,
})
export type WarehouseCreateParams = z.input<typeof warehouseCreateParamsSchema>

/** `tenantId`, `addressId`, and `orgLocationId` are never client-controlled. */
export const warehouseUpdateParamsSchema = z.strictObject({
  name: z.string().trim().min(1).optional(),
  operatingModel: warehouseOperatingModelSchema.optional(),
  agentName: optionalText(120),
  code: optionalWarehouseCode,
  mailboxPlacement: mailboxPlacementSchema.optional(),
  mailboxPrefix: optionalText(16),
  instructions: optionalText(500),
  isActive: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
  address: addressUpdateParamsSchema.optional(),
})
export type WarehouseUpdateParams = z.input<typeof warehouseUpdateParamsSchema>

export interface WarehouseListParams {
  tenantId: string
}
