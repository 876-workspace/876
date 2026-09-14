import { z } from 'zod'

const packageStatusSchema = z.enum([
  'PRE_ALERT',
  'RECEIVED',
  'IN_TRANSIT',
  'ARRIVED',
  'READY_FOR_PICKUP',
  'COLLECTED',
  'UNCLAIMED',
])

const packageTypeSchema = z.enum([
  'CARTON',
  'ENVELOPE',
  'BAG',
  'PALLET',
  'OTHER',
])

const packageCategoryReferenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
})

export const packageSchema = z.object({
  object: z.literal('package'),
  id: z.string(),
  tenant_id: z.string(),
  customer_id: z.string(),
  branch_id: z.string().nullable(),
  mailbox_id: z.string().nullable(),
  category_id: z.string().nullable(),
  category: packageCategoryReferenceSchema.nullable(),
  tracking_num: z.string().nullable(),
  status: packageStatusSchema,
  package_type: packageTypeSchema,
  description: z.string().nullable(),
  quantity: z.number().int(),
  actual_weight: z.number().nullable(),
  collected_at: z.number().int().nullable(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export const packageListSchema = z.object({
  object: z.literal('list'),
  data: z.array(packageSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export const createPackageBodySchema = z.strictObject({
  customer_id: z.string(),
  branch_id: z.string().nullable().optional(),
  mailbox_id: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  tracking_num: z.string().nullable().optional(),
  status: packageStatusSchema.optional(),
  package_type: packageTypeSchema.optional(),
  description: z.string().nullable().optional(),
  quantity: z.number().optional(),
  actual_weight: z.number().nullable().optional(),
})

export const updatePackageBodySchema = z.strictObject({
  branch_id: z.string().nullable().optional(),
  mailbox_id: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  tracking_num: z.string().nullable().optional(),
  status: packageStatusSchema.optional(),
  package_type: packageTypeSchema.optional(),
  description: z.string().nullable().optional(),
  quantity: z.number().optional(),
  actual_weight: z.number().nullable().optional(),
})

export type Package = z.infer<typeof packageSchema>
export type PackageList = z.infer<typeof packageListSchema>
export type PackageStatus = z.infer<typeof packageStatusSchema>
export type ListPackagesParams = {
  status?: PackageStatus
  customer_id?: string
  branch_id?: string
  category_id?: string
  limit?: number
  starting_after?: string
  ending_before?: string
}
export type CreatePackageBody = z.input<typeof createPackageBodySchema>
export type UpdatePackageBody = z.input<typeof updatePackageBodySchema>
