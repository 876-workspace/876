import { z } from 'zod'

import {
  addressSchema,
  createAddressBodySchema,
  updateAddressBodySchema,
} from './address.schema'

export const customerAddressTypeSchema = z.enum([
  'HOME',
  'WORK',
  'DELIVERY',
  'SHIPPING',
  'BILLING',
  'RETURN',
  'OTHER',
])

export const customerAddressSchema = z.object({
  object: z.literal('customer_address'),
  id: z.string(),
  tenant_id: z.string(),
  customer_id: z.string(),
  address_id: z.string(),
  type: customerAddressTypeSchema,
  is_default: z.boolean(),
  address: addressSchema,
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export const customerAddressListSchema = z.object({
  object: z.literal('list'),
  data: z.array(customerAddressSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export const deletedCustomerAddressSchema = z.object({
  object: z.literal('customer_address'),
  id: z.string(),
  deleted: z.literal(true),
})

export const createCustomerAddressBodySchema = z.strictObject({
  type: customerAddressTypeSchema.optional(),
  is_default: z.boolean().optional(),
  address: createAddressBodySchema,
})

export const updateCustomerAddressBodySchema = z.strictObject({
  type: customerAddressTypeSchema.optional(),
  is_default: z.boolean().optional(),
  address: updateAddressBodySchema.optional(),
})

export type CustomerAddress = z.infer<typeof customerAddressSchema>
export type CustomerAddressList = z.infer<typeof customerAddressListSchema>
export type DeletedCustomerAddress = z.infer<
  typeof deletedCustomerAddressSchema
>
export type CustomerAddressType = z.infer<typeof customerAddressTypeSchema>
export type CreateCustomerAddressBody = z.input<
  typeof createCustomerAddressBodySchema
>
export type UpdateCustomerAddressBody = z.input<
  typeof updateCustomerAddressBodySchema
>
export type ListCustomerAddressesParams = {
  type?: CustomerAddressType
  limit?: number
  starting_after?: string
  ending_before?: string
}
