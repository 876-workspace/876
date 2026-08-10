import { z } from 'zod'

import { portalCustomerSchema } from './portal-customer.schema'

const portalMailboxSchema = z.object({
  object: z.literal('mailbox'),
  id: z.string(),
  tenant_id: z.string(),
  customer_id: z.string(),
  number: z.string(),
  is_primary: z.boolean(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export const portalEnrollmentBodySchema = z.strictObject({
  billing_customer_id: z.string().min(1),
})

export const portalEnrollmentSchema = z.object({
  object: z.literal('courier_customer_enrollment'),
  customer: portalCustomerSchema,
  mailbox: portalMailboxSchema,
})

export type PortalEnrollmentBody = z.input<typeof portalEnrollmentBodySchema>
export type PortalEnrollment = z.infer<typeof portalEnrollmentSchema>
