import { z } from 'zod'

export const portalCustomerSchema = z.object({
  object: z.literal('courier_customer_profile'),
  id: z.string(),
  tenantId: z.string(),
  userId: z.string().nullable(),
  billingCustomerId: z.string(),
  branchId: z.string().nullable(),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  isCommercial: z.boolean(),
  firstSeenAt: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  deletedAt: z.number().int().nullable(),
})

export type PortalCustomer = z.infer<typeof portalCustomerSchema>
