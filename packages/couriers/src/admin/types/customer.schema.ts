import { z } from 'zod'

import { mailboxSchema } from './mailbox.schema'

const customerStatusSchema = z.enum(['ACTIVE', 'SUSPENDED'])
const customerKindSchema = z.enum(['INDIVIDUAL', 'BUSINESS'])

export const customerSchema = z.object({
  object: z.literal('courier_customer_profile'),
  id: z.string(),
  tenantId: z.string(),
  userId: z.string().nullable(),
  billingCustomerId: z.string(),
  branchId: z.string().nullable(),
  status: customerStatusSchema,
  trn: z.string().nullable(),
  isCommercial: z.boolean(),
  firstSeenAt: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  deletedAt: z.number().int().nullable(),
})

export const customerListSchema = z.object({
  object: z.literal('list'),
  data: z.array(customerSchema),
  hasMore: z.boolean(),
  totalCount: z.number().int().nullable(),
  url: z.string(),
})

export const createCustomerBodySchema = z
  .strictObject({
    idempotencyKey: z.string().min(8).max(255),
    customerKind: customerKindSchema.default('INDIVIDUAL'),
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).nullable().optional(),
    companyName: z.string().trim().min(1).optional(),
    email: z.string().trim().pipe(z.email()).nullable().optional(),
    phone: z.string().trim().min(1).nullable().optional(),
    branchId: z.string().nullable().optional(),
    status: customerStatusSchema.optional(),
    trn: z.string().trim().min(1).nullable().optional(),
    isCommercial: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const kind = value.customer_kind ?? 'INDIVIDUAL'
    if (kind === 'INDIVIDUAL' && !value.first_name) {
      ctx.addIssue({
        code: 'custom',
        path: ['first_name'],
        message: 'First name is required for an individual.',
      })
    }
    if (kind === 'BUSINESS' && !value.company_name) {
      ctx.addIssue({
        code: 'custom',
        path: ['company_name'],
        message: 'Company name is required for a business.',
      })
    }
  })

export const updateCustomerBodySchema = z.strictObject({
  branchId: z.string().nullable().optional(),
  status: customerStatusSchema.optional(),
  trn: z.string().nullable().optional(),
  isCommercial: z.boolean().optional(),
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).nullable().optional(),
  companyName: z.string().trim().min(1).optional(),
  email: z.string().trim().pipe(z.email()).nullable().optional(),
  phone: z.string().trim().min(1).nullable().optional(),
})

export const deletedCustomerSchema = z.object({
  object: z.literal('courier_customer_profile'),
  id: z.string(),
  deleted: z.literal(true),
})

export const customerEnrollmentSchema = z.object({
  object: z.literal('courier_customer_enrollment'),
  customer: customerSchema,
  mailbox: mailboxSchema,
})

export const customerEnrollmentBodySchema = z.strictObject({
  billingCustomerId: z.string().min(1),
  userId: z.string().min(1).nullable().optional(),
  branchId: z.string().min(1).nullable().optional(),
  status: customerStatusSchema.optional(),
  isCommercial: z.boolean().optional(),
})

export const deleteCustomerBodySchema = z.strictObject({
  deletedBy: z.string().min(1).optional(),
  reason: z.string().min(1).nullable().optional(),
  deletionReason: z.string().min(1).nullable().optional(),
})

export const createMailboxBodySchema = z.strictObject({
  number: z.string(),
  isPrimary: z.boolean().optional(),
})

export const updateMailboxBodySchema = z.strictObject({
  isPrimary: z.boolean(),
})

export type Customer = z.infer<typeof customerSchema>
export type CustomerList = z.infer<typeof customerListSchema>
export type CustomerStatus = z.infer<typeof customerStatusSchema>
export type DeletedCustomer = z.infer<typeof deletedCustomerSchema>
export type CustomerEnrollment = z.infer<typeof customerEnrollmentSchema>
export type ListCustomersParams = {
  status?: CustomerStatus
  branchId?: string
  limit?: number
  startingAfter?: string
  endingBefore?: string
}
export type CreateCustomerBody = z.input<typeof createCustomerBodySchema>
export type CustomerEnrollmentBody = z.input<
  typeof customerEnrollmentBodySchema
>
export type UpdateCustomerBody = z.input<typeof updateCustomerBodySchema>
export type DeleteCustomerBody = z.input<typeof deleteCustomerBodySchema>
export type CreateMailboxBody = z.input<typeof createMailboxBodySchema>
export type UpdateMailboxBody = z.input<typeof updateMailboxBodySchema>
