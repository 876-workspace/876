import { z } from 'zod'

import {
  addressCreateBodySchema,
  addressSchema,
  addressUpdateBodySchema,
} from '@/modules/addresses'

export const customerAddressTypeSchema = z.enum([
  'HOME',
  'WORK',
  'DELIVERY',
  'SHIPPING',
  'BILLING',
  'RETURN',
  'OTHER',
])

export const customerAddressSchema = z
  .object({
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
  .meta({ id: 'CustomerAddress' })

export const tenantCustomerParamsSchema = z.strictObject({
  tenantId: z.string().min(1),
  customerId: z.string().min(1),
})

export const customerAddressParamsSchema = tenantCustomerParamsSchema.extend({
  id: z.string().min(1),
})

export const listCustomerAddressesQuerySchema = z
  .strictObject({
    type: customerAddressTypeSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    starting_after: z.string().min(1).optional(),
    ending_before: z.string().min(1).optional(),
  })
  .refine((query) => !(query.starting_after && query.ending_before), {
    message: 'Only one cursor may be provided.',
  })

export const createCustomerAddressBodySchema = z.strictObject({
  type: customerAddressTypeSchema.optional(),
  is_default: z.boolean().optional(),
  address: addressCreateBodySchema,
})

export const updateCustomerAddressBodySchema = z.strictObject({
  type: customerAddressTypeSchema.optional(),
  is_default: z.boolean().optional(),
  address: addressUpdateBodySchema.optional(),
})

export type CustomerAddress = z.infer<typeof customerAddressSchema>
export type CustomerAddressType = z.infer<typeof customerAddressTypeSchema>
export type TenantCustomerParams = z.infer<typeof tenantCustomerParamsSchema>
export type CustomerAddressParams = z.infer<typeof customerAddressParamsSchema>
export type ListCustomerAddressesQuery = z.infer<
  typeof listCustomerAddressesQuerySchema
>
export type CreateCustomerAddressBody = z.infer<
  typeof createCustomerAddressBodySchema
>
export type UpdateCustomerAddressBody = z.infer<
  typeof updateCustomerAddressBodySchema
>
