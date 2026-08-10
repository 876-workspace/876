import { z } from 'zod'

export const customerStatusSchema = z.enum(['ACTIVE', 'SUSPENDED'])
export const customerSchema = z
  .object({
    object: z.literal('courier_customer_profile'),
    id: z.string(),
    tenant_id: z.string(),
    user_id: z.string().nullable(),
    billing_customer_id: z.string(),
    branch_id: z.string().nullable(),
    status: customerStatusSchema,
    trn: z.string().nullable(),
    is_commercial: z.boolean(),
    first_seen_at: z.number().int(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
    deleted_at: z.number().int().nullable(),
  })
  .meta({ id: 'CourierCustomerProfile' })
export const mailboxSchema = z
  .object({
    object: z.literal('mailbox'),
    id: z.string(),
    tenant_id: z.string(),
    customer_id: z.string(),
    number: z.string(),
    is_primary: z.boolean(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'Mailbox' })
export const tenantParamsSchema = z.strictObject({
  tenantId: z.string().min(1),
})
export const customerParamsSchema = tenantParamsSchema.extend({
  id: z.string().min(1),
})
export const listCustomersQuerySchema = z
  .strictObject({
    status: customerStatusSchema.optional(),
    branch_id: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    starting_after: z.string().min(1).optional(),
    ending_before: z.string().min(1).optional(),
  })
  .refine((query) => !(query.starting_after && query.ending_before), {
    message: 'Only one cursor may be provided.',
  })
export const createCustomerBodySchema = z
  .strictObject({
    billing_customer_id: z.string().min(1).optional(),
    user_id: z.string().min(1).nullable().optional(),
    branch_id: z.string().min(1).nullable().optional(),
    status: customerStatusSchema.optional(),
    trn: z.string().trim().min(1).nullable().optional(),
    is_commercial: z.boolean().optional(),
    idempotency_key: z.string().min(8).max(255).optional(),
    customer_kind: z.enum(['INDIVIDUAL', 'BUSINESS']).optional(),
    first_name: z.string().trim().min(1).optional(),
    last_name: z.string().trim().min(1).nullable().optional(),
    company_name: z.string().trim().min(1).optional(),
    email: z.string().trim().pipe(z.email()).nullable().optional(),
    phone: z.string().trim().min(1).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    const hasLegacy = typeof value.billing_customer_id === 'string'
    const hasHighLevel = typeof value.idempotency_key === 'string'
    if (!hasLegacy && !hasHighLevel) {
      ctx.addIssue({
        code: 'custom',
        path: ['idempotency_key'],
        message: 'Either billing_customer_id or idempotency_key is required.',
      })
    }
    if (hasHighLevel) {
      if (value.customer_kind === 'INDIVIDUAL' && !value.first_name) {
        ctx.addIssue({
          code: 'custom',
          path: ['first_name'],
          message: 'First name is required for an individual.',
        })
      }
      if (value.customer_kind === 'BUSINESS' && !value.company_name) {
        ctx.addIssue({
          code: 'custom',
          path: ['company_name'],
          message: 'Company name is required for a business.',
        })
      }
    }
  })
export const updateCustomerBodySchema = z.strictObject({
  branch_id: z.string().min(1).nullable().optional(),
  status: customerStatusSchema.optional(),
  trn: z.string().trim().min(1).nullable().optional(),
  is_commercial: z.boolean().optional(),
  first_name: z.string().trim().min(1).optional(),
  last_name: z.string().trim().min(1).nullable().optional(),
  company_name: z.string().trim().min(1).optional(),
  email: z.string().trim().pipe(z.email()).nullable().optional(),
  phone: z.string().trim().min(1).nullable().optional(),
})
export const deleteCustomerBodySchema = z
  .strictObject({
    deleted_by: z.string().trim().min(1).optional(),
    reason: z.string().trim().min(1).nullable().optional(),
    deletion_reason: z.string().trim().min(1).nullable().optional(),
  })
  .optional()
export const deletedCustomerSchema = z.object({
  object: z.literal('courier_customer_profile'),
  id: z.string(),
  deleted: z.literal(true),
})
export const customerEnrollmentSchema = z
  .object({
    object: z.literal('courier_customer_enrollment'),
    customer: customerSchema,
    mailbox: mailboxSchema,
  })
  .meta({ id: 'CourierCustomerEnrollment' })
export const customerEnrollmentBodySchema = z.strictObject({
  billing_customer_id: z.string().min(1),
  user_id: z.string().min(1).nullable().optional(),
  branch_id: z.string().min(1).nullable().optional(),
  status: customerStatusSchema.optional(),
  is_commercial: z.boolean().optional(),
})
export const mailboxCreateBodySchema = z.strictObject({
  number: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9-]+$/),
  is_primary: z.boolean().optional(),
})
export const mailboxUpdateBodySchema = z.strictObject({
  is_primary: z.boolean(),
})
export type Customer = z.infer<typeof customerSchema>
export type Mailbox = z.infer<typeof mailboxSchema>
export type TenantParams = z.infer<typeof tenantParamsSchema>
export type CustomerParams = z.infer<typeof customerParamsSchema>
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>
export type CreateCustomerBody = z.infer<typeof createCustomerBodySchema>
export type UpdateCustomerBody = z.infer<typeof updateCustomerBodySchema>
export type DeleteCustomerBody = z.infer<typeof deleteCustomerBodySchema>
export type DeletedCustomer = z.infer<typeof deletedCustomerSchema>
export type CustomerEnrollment = z.infer<typeof customerEnrollmentSchema>
export type CustomerEnrollmentBody = z.infer<
  typeof customerEnrollmentBodySchema
>
export type MailboxCreateBody = z.infer<typeof mailboxCreateBodySchema>
export type MailboxUpdateBody = z.infer<typeof mailboxUpdateBodySchema>
