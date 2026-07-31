import * as z from 'zod'

import {
  addressCreateParamsSchema,
  addressUpdateParamsSchema,
  addressViewSchema,
} from './address'

/**
 * The role an address plays for a customer. The role belongs to the
 * relationship, not the address: one address can be a customer's home and their
 * billing address at once, and two customers can share one with different roles.
 */
export const customerAddressTypeSchema = z.enum([
  'HOME',
  'WORK',
  'DELIVERY',
  'SHIPPING',
  'BILLING',
  'RETURN',
  'OTHER',
])
export type CustomerAddressType = z.infer<typeof customerAddressTypeSchema>

export const customerAddressViewSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  customerId: z.string(),
  addressId: z.string(),
  type: customerAddressTypeSchema,
  isDefault: z.boolean(),
  address: addressViewSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type CustomerAddressView = z.infer<typeof customerAddressViewSchema>

export const customerAddressCreateParamsSchema = z.strictObject({
  customerId: z.string().min(1),
  type: customerAddressTypeSchema.optional(),
  isDefault: z.boolean().optional(),
  address: addressCreateParamsSchema,
})
export type CustomerAddressCreateParams = z.input<
  typeof customerAddressCreateParamsSchema
>

/** The customer and tenant are fixed; an address never moves between them. */
export const customerAddressUpdateParamsSchema = z.strictObject({
  type: customerAddressTypeSchema.optional(),
  isDefault: z.boolean().optional(),
  address: addressUpdateParamsSchema.optional(),
})
export type CustomerAddressUpdateParams = z.input<
  typeof customerAddressUpdateParamsSchema
>

export const customerAddressListParamsSchema = z.strictObject({
  customerId: z.string().min(1),
  type: customerAddressTypeSchema.optional(),
})
export type CustomerAddressListParams = z.input<
  typeof customerAddressListParamsSchema
>

export const deletedCustomerAddressSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedCustomerAddress = z.infer<
  typeof deletedCustomerAddressSchema
>
