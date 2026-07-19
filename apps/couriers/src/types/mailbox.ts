import * as z from 'zod'

export const mailboxViewSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  tenantId: z.string(),
  number: z.string(),
  isPrimary: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type MailboxView = z.infer<typeof mailboxViewSchema>

export interface MailboxAllocateParams {
  tenantId: string
}

export interface MailboxAllocation {
  number: string
}

export interface CustomerMailboxListParams {
  tenantId: string
  customerId: string
}

export const mailboxCreateParamsSchema = z.strictObject({
  customerId: z.string(),
  number: z.string().min(1),
  isPrimary: z.boolean().optional(),
})
export type MailboxCreateParams = z.input<typeof mailboxCreateParamsSchema>

export const mailboxUpdateParamsSchema = z.strictObject({
  isPrimary: z.boolean().optional(),
})
export type MailboxUpdateParams = z.input<typeof mailboxUpdateParamsSchema>

export const mailboxRetrieveParamsSchema = z.strictObject({
  id: z.string(),
})
export type MailboxRetrieveParams = z.input<typeof mailboxRetrieveParamsSchema>

export const mailboxListParamsSchema = z.strictObject({
  customerId: z.string(),
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
})
export type MailboxListParams = z.input<typeof mailboxListParamsSchema>

export const deletedMailboxSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedMailbox = z.infer<typeof deletedMailboxSchema>
