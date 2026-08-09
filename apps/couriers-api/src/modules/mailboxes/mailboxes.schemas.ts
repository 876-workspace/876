import { z } from 'zod'

export const tenantIdParamsSchema = z.strictObject({
  tenantId: z.string().min(1),
})

export const listMailboxesQuerySchema = z.strictObject({
  customer_id: z.string().min(1).optional(),
})

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
  .meta({ id: 'TenantMailbox' })

export const mailboxAllocationSchema = z
  .object({
    object: z.literal('mailbox_allocation'),
    number: z.string(),
  })
  .meta({ id: 'MailboxAllocation' })

export type TenantIdParams = z.infer<typeof tenantIdParamsSchema>
export type ListMailboxesQuery = z.infer<typeof listMailboxesQuerySchema>
export type Mailbox = z.infer<typeof mailboxSchema>
export type MailboxAllocation = z.infer<typeof mailboxAllocationSchema>
