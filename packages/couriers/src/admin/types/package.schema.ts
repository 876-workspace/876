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

export const packageSchema = z.object({
  object: z.literal('package'),
  id: z.string(),
  tenantId: z.string(),
  customerId: z.string(),
  branchId: z.string().nullable(),
  mailboxId: z.string().nullable(),
  trackingNum: z.string().nullable(),
  status: packageStatusSchema,
  packageType: packageTypeSchema,
  description: z.string().nullable(),
  quantity: z.number().int(),
  actualWeight: z.number().nullable(),
  collectedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const packageListSchema = z.object({
  object: z.literal('list'),
  data: z.array(packageSchema),
  hasMore: z.boolean(),
  totalCount: z.number().int().nullable(),
  url: z.string(),
})

export const createPackageBodySchema = z.strictObject({
  customerId: z.string(),
  branchId: z.string().nullable().optional(),
  mailboxId: z.string().nullable().optional(),
  trackingNum: z.string().nullable().optional(),
  status: packageStatusSchema.optional(),
  packageType: packageTypeSchema.optional(),
  description: z.string().nullable().optional(),
  quantity: z.number().optional(),
  actualWeight: z.number().nullable().optional(),
})

export const updatePackageBodySchema = z.strictObject({
  branchId: z.string().nullable().optional(),
  mailboxId: z.string().nullable().optional(),
  trackingNum: z.string().nullable().optional(),
  status: packageStatusSchema.optional(),
  packageType: packageTypeSchema.optional(),
  description: z.string().nullable().optional(),
  quantity: z.number().optional(),
  actualWeight: z.number().nullable().optional(),
})

export type Package = z.infer<typeof packageSchema>
export type PackageList = z.infer<typeof packageListSchema>
export type PackageStatus = z.infer<typeof packageStatusSchema>
export type ListPackagesParams = {
  status?: PackageStatus
  customerId?: string
  branchId?: string
  limit?: number
  startingAfter?: string
  endingBefore?: string
}
export type CreatePackageBody = z.input<typeof createPackageBodySchema>
export type UpdatePackageBody = z.input<typeof updatePackageBodySchema>
