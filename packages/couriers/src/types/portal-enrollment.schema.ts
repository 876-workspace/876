import { z } from 'zod'

import { portalCustomerSchema } from './portal-customer.schema'

const portalMailboxSchema = z.object({
  object: z.literal('mailbox'),
  id: z.string(),
  tenantId: z.string(),
  customerId: z.string(),
  number: z.string(),
  isPrimary: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const portalEnrollmentBodySchema = z.strictObject({
  billingCustomerId: z.string().min(1),
})

export const portalEnrollmentSchema = z.object({
  object: z.literal('courier_customer_enrollment'),
  customer: portalCustomerSchema,
  mailbox: portalMailboxSchema,
})

export type PortalEnrollmentBody = z.input<typeof portalEnrollmentBodySchema>
export type PortalEnrollment = z.infer<typeof portalEnrollmentSchema>
