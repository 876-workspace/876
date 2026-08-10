import { z } from 'zod'

export const mailboxSchema = z.object({
  object: z.literal('mailbox'),
  id: z.string(),
  tenant_id: z.string(),
  customer_id: z.string(),
  number: z.string(),
  is_primary: z.boolean(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export const mailboxListSchema = z.object({
  object: z.literal('list'),
  data: z.array(mailboxSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export const mailboxAllocationSchema = z.object({
  object: z.literal('mailbox_allocation'),
  number: z.string(),
})

export type Mailbox = z.infer<typeof mailboxSchema>
export type MailboxList = z.infer<typeof mailboxListSchema>
export type MailboxAllocation = z.infer<typeof mailboxAllocationSchema>
export type ListMailboxesParams = {
  customer_id?: string
  limit?: number
  starting_after?: string
  ending_before?: string
}
