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
export type Branch = z.infer<typeof branchSchema>
export type BranchList = z.infer<typeof branchListSchema>
