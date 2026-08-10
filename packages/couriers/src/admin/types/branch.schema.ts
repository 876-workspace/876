import { z } from 'zod'

const addressSchema = z.object({
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
export const branchSchema = z.object({
  object: z.literal('branch'),
  id: z.string(),
  tenant_id: z.string(),
  address_id: z.string(),
  org_location_id: z.string().nullable(),
  name: z.string(),
  phone: z.string().nullable(),
  is_default: z.boolean(),
  is_active: z.boolean(),
  settings: z.record(z.string(), z.unknown()).nullable(),
  address: addressSchema,
  created_at: z.number().int(),
  updated_at: z.number().int(),
})
export const branchListSchema = z.object({
  object: z.literal('list'),
  data: z.array(branchSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

const addressCreateBodySchema = z.strictObject({
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

const addressUpdateBodySchema = z.strictObject({
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

export const createBranchBodySchema = z.strictObject({
  name: z.string(),
  phone: z.string().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  address: addressCreateBodySchema,
})

export const updateBranchBodySchema = z.strictObject({
  name: z.string().optional(),
  phone: z.string().nullable().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  address: addressUpdateBodySchema.optional(),
})

export type Branch = z.infer<typeof branchSchema>
export type BranchList = z.infer<typeof branchListSchema>
export type CreateBranchBody = z.input<typeof createBranchBodySchema>
export type UpdateBranchBody = z.input<typeof updateBranchBodySchema>
