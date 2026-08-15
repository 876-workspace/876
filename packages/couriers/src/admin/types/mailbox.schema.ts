import { z } from 'zod'

export const mailboxSchema = z.object({
  object: z.literal('mailbox'),
  id: z.string(),
  tenantId: z.string(),
  customerId: z.string(),
  number: z.string(),
  isPrimary: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const mailboxListSchema = z.object({
  object: z.literal('list'),
  data: z.array(mailboxSchema),
  hasMore: z.boolean(),
  totalCount: z.number().int().nullable(),
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
  customerId?: string
  limit?: number
  startingAfter?: string
  endingBefore?: string
}
