import { z } from 'zod'

export const portalPackageStatusSchema = z.enum([
  'PRE_ALERT',
  'RECEIVED',
  'IN_TRANSIT',
  'ARRIVED',
  'READY_FOR_PICKUP',
  'COLLECTED',
  'UNCLAIMED',
])

export const portalPackageSchema = z.object({
  object: z.literal('package'),
  id: z.string(),
  tenantId: z.string(),
  customerId: z.string(),
  branchId: z.string().nullable(),
  mailboxId: z.string().nullable(),
  trackingNum: z.string().nullable(),
  status: portalPackageStatusSchema,
  packageType: z.enum(['CARTON', 'ENVELOPE', 'BAG', 'PALLET', 'OTHER']),
  description: z.string().nullable(),
  quantity: z.number().int(),
  actualWeight: z.number().nullable(),
  chargeableWeight: z.number().nullable(),
  carrier: z.object({ id: z.string(), name: z.string() }).nullable(),
  branch: z.object({ id: z.string(), name: z.string() }).nullable(),
  mailbox: z.object({ id: z.string(), number: z.string() }).nullable(),
  collectedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const portalPackageListSchema = z.object({
  object: z.literal('list'),
  data: z.array(portalPackageSchema),
  hasMore: z.boolean(),
  totalCount: z.number().int().nullable(),
  url: z.string(),
})

export type PortalPackage = z.infer<typeof portalPackageSchema>
export type PortalPackageList = z.infer<typeof portalPackageListSchema>
export type PortalPackageStatus = z.infer<typeof portalPackageStatusSchema>
