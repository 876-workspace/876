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
export const createCustomerBodySchema = z.strictObject({
  billing_customer_id: z.string().min(1),
  user_id: z.string().min(1).nullable().optional(),
  branch_id: z.string().min(1).nullable().optional(),
  status: customerStatusSchema.optional(),
  is_commercial: z.boolean().optional(),
})
export const updateCustomerBodySchema = z.strictObject({
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
export type MailboxCreateBody = z.infer<typeof mailboxCreateBodySchema>
export type MailboxUpdateBody = z.infer<typeof mailboxUpdateBodySchema>
