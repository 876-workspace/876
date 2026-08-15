import { z } from 'zod'

export const addressSchema = z.object({
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

export const addressListSchema = z.object({
  object: z.literal('list'),
  data: z.array(addressSchema),
  hasMore: z.boolean(),
  totalCount: z.number().int().nullable(),
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
  countryCode: z.string(),
  regionCode: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isActive: z.boolean().optional(),
})

export const updateAddressBodySchema = z.strictObject({
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

export type Address = z.infer<typeof addressSchema>
export type AddressList = z.infer<typeof addressListSchema>
export type DeletedAddress = z.infer<typeof deletedAddressSchema>
export type CreateAddressBody = z.input<typeof createAddressBodySchema>
export type UpdateAddressBody = z.input<typeof updateAddressBodySchema>
export type ListAddressesParams = {
  isActive?: boolean
  countryCode?: string
  limit?: number
  startingAfter?: string
  endingBefore?: string
}
