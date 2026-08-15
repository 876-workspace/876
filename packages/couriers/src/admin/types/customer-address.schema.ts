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
  tenantId: z.string(),
  customerId: z.string(),
  addressId: z.string(),
  type: customerAddressTypeSchema,
  isDefault: z.boolean(),
  address: addressSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const customerAddressListSchema = z.object({
  object: z.literal('list'),
  data: z.array(customerAddressSchema),
  hasMore: z.boolean(),
  totalCount: z.number().int().nullable(),
  url: z.string(),
})

export const deletedCustomerAddressSchema = z.object({
  object: z.literal('customer_address'),
  id: z.string(),
  deleted: z.literal(true),
})

export const createCustomerAddressBodySchema = z.strictObject({
  type: customerAddressTypeSchema.optional(),
  isDefault: z.boolean().optional(),
  address: createAddressBodySchema,
})

export const updateCustomerAddressBodySchema = z.strictObject({
  type: customerAddressTypeSchema.optional(),
  isDefault: z.boolean().optional(),
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
  startingAfter?: string
  endingBefore?: string
}
