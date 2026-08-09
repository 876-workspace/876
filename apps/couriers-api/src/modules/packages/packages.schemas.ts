import { z } from 'zod'
export const packageStatusSchema = z.enum([
  'PRE_ALERT',
  'RECEIVED',
  'IN_TRANSIT',
  'ARRIVED',
  'READY_FOR_PICKUP',
  'COLLECTED',
  'UNCLAIMED',
])
export const packageTypeSchema = z.enum([
  'CARTON',
  'ENVELOPE',
  'BAG',
  'PALLET',
  'OTHER',
])
export const packageSchema = z
  .object({
    object: z.literal('package'),
    id: z.string(),
    tenant_id: z.string(),
    customer_id: z.string(),
    branch_id: z.string().nullable(),
    mailbox_id: z.string().nullable(),
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
  .meta({ id: 'Package' })
export const tenantParamsSchema = z.strictObject({
  tenantId: z.string().min(1),
})
export const packageParamsSchema = tenantParamsSchema.extend({
  id: z.string().min(1),
})
export const listPackagesQuerySchema = z.strictObject({
  status: packageStatusSchema.optional(),
  customer_id: z.string().min(1).optional(),
  branch_id: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})
export const createPackageBodySchema = z.strictObject({
  customer_id: z.string().min(1),
  branch_id: z.string().min(1).nullable().optional(),
  mailbox_id: z.string().min(1).nullable().optional(),
  tracking_num: z.string().trim().min(1).nullable().optional(),
  status: packageStatusSchema.optional(),
  package_type: packageTypeSchema.optional(),
  description: z.string().trim().min(1).nullable().optional(),
  quantity: z.number().int().min(1).optional(),
  actual_weight: z.number().positive().nullable().optional(),
})
export const updatePackageBodySchema = z.strictObject({
  branch_id: z.string().min(1).nullable().optional(),
  mailbox_id: z.string().min(1).nullable().optional(),
  tracking_num: z.string().trim().min(1).nullable().optional(),
  status: packageStatusSchema.optional(),
  package_type: packageTypeSchema.optional(),
  description: z.string().trim().min(1).nullable().optional(),
  quantity: z.number().int().min(1).optional(),
  actual_weight: z.number().positive().nullable().optional(),
})
export type Package = z.infer<typeof packageSchema>
export type TenantParams = z.infer<typeof tenantParamsSchema>
export type PackageParams = z.infer<typeof packageParamsSchema>
export type ListPackagesQuery = z.infer<typeof listPackagesQuerySchema>
export type CreatePackageBody = z.infer<typeof createPackageBodySchema>
export type UpdatePackageBody = z.infer<typeof updatePackageBodySchema>
