import { z } from 'zod'

export const addressSchema = z.object({
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

export const addressListSchema = z.object({
  object: z.literal('list'),
  data: z.array(addressSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export const deletedAddressSchema = z.object({
  object: z.literal('address'),
  id: z.string(),
  deleted: z.literal(true),
})

export const createAddressBodySchema = z.strictObject({
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

export const updateAddressBodySchema = z.strictObject({
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

export type Address = z.infer<typeof addressSchema>
export type AddressList = z.infer<typeof addressListSchema>
export type DeletedAddress = z.infer<typeof deletedAddressSchema>
export type CreateAddressBody = z.input<typeof createAddressBodySchema>
export type UpdateAddressBody = z.input<typeof updateAddressBodySchema>
export type ListAddressesParams = {
  is_active?: boolean
  country_code?: string
  limit?: number
  starting_after?: string
  ending_before?: string
}
