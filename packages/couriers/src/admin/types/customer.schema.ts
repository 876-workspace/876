import { z } from 'zod'

const customerStatusSchema = z.enum(['ACTIVE', 'SUSPENDED'])

export const customerSchema = z.object({
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

export const customerListSchema = z.object({
  object: z.literal('list'),
  data: z.array(customerSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export const createCustomerBodySchema = z.strictObject({
  billing_customer_id: z.string(),
  user_id: z.string().nullable().optional(),
  branch_id: z.string().nullable().optional(),
  status: customerStatusSchema.optional(),
  is_commercial: z.boolean().optional(),
})

export const updateCustomerBodySchema = z.strictObject({
  branch_id: z.string().nullable().optional(),
  status: customerStatusSchema.optional(),
  is_commercial: z.boolean().optional(),
})

export const createMailboxBodySchema = z.strictObject({
  number: z.string(),
  is_primary: z.boolean().optional(),
})

export const updateMailboxBodySchema = z.strictObject({
  is_primary: z.boolean(),
})

export type Customer = z.infer<typeof customerSchema>
export type CustomerList = z.infer<typeof customerListSchema>
export type CustomerStatus = z.infer<typeof customerStatusSchema>
export type ListCustomersParams = {
  status?: CustomerStatus
  branch_id?: string
  limit?: number
  starting_after?: string
  ending_before?: string
}
export type CreateCustomerBody = z.input<typeof createCustomerBodySchema>
export type UpdateCustomerBody = z.input<typeof updateCustomerBodySchema>
export type CreateMailboxBody = z.input<typeof createMailboxBodySchema>
export type UpdateMailboxBody = z.input<typeof updateMailboxBodySchema>
