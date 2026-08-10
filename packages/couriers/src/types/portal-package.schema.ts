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
  tenant_id: z.string(),
  customer_id: z.string(),
  branch_id: z.string().nullable(),
  mailbox_id: z.string().nullable(),
  tracking_num: z.string().nullable(),
  status: portalPackageStatusSchema,
  package_type: z.enum(['CARTON', 'ENVELOPE', 'BAG', 'PALLET', 'OTHER']),
  description: z.string().nullable(),
  quantity: z.number().int(),
  actual_weight: z.number().nullable(),
  chargeable_weight: z.number().nullable(),
  carrier: z.object({ id: z.string(), name: z.string() }).nullable(),
  branch: z.object({ id: z.string(), name: z.string() }).nullable(),
  mailbox: z.object({ id: z.string(), number: z.string() }).nullable(),
  collected_at: z.number().int().nullable(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export const portalPackageListSchema = z.object({
  object: z.literal('list'),
  data: z.array(portalPackageSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export type PortalPackage = z.infer<typeof portalPackageSchema>
export type PortalPackageList = z.infer<typeof portalPackageListSchema>
export type PortalPackageStatus = z.infer<typeof portalPackageStatusSchema>
