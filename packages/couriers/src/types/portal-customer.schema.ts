import { z } from 'zod'

export const portalCustomerSchema = z.object({
  object: z.literal('courier_customer_profile'),
  id: z.string(),
  tenant_id: z.string(),
  user_id: z.string().nullable(),
  billing_customer_id: z.string(),
  branch_id: z.string().nullable(),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  is_commercial: z.boolean(),
  first_seen_at: z.number().int(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
  deleted_at: z.number().int().nullable(),
})

export type PortalCustomer = z.infer<typeof portalCustomerSchema>
