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
export const branchSchema = z.object({
  object: z.literal('branch'),
  id: z.string(),
  tenantId: z.string(),
  addressId: z.string(),
  orgLocationId: z.string().nullable(),
  name: z.string(),
  phone: z.string().nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  settings: z.record(z.string(), z.unknown()).nullable(),
  address: addressSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export const branchListSchema = z.object({
  object: z.literal('list'),
  data: z.array(branchSchema),
  hasMore: z.boolean(),
  totalCount: z.number().int().nullable(),
  url: z.string(),
})

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

export const createBranchBodySchema = z.strictObject({
  name: z.string(),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  address: addressCreateBodySchema,
})

export const updateBranchBodySchema = z.strictObject({
  name: z.string().optional(),
  phone: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  address: addressUpdateBodySchema.optional(),
})

export type Branch = z.infer<typeof branchSchema>
export type BranchList = z.infer<typeof branchListSchema>
export type CreateBranchBody = z.input<typeof createBranchBodySchema>
export type UpdateBranchBody = z.input<typeof updateBranchBodySchema>
