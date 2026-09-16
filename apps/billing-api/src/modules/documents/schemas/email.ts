import { z } from 'zod'

const headerText = z
  .string()
  .trim()
  .min(1)
  .max(998)
  .refine((value) => !/[\r\n]/.test(value), 'Line breaks are not allowed.')

export const DocumentEmailRecipientSchema = z.strictObject({
  email: z.email(),
  name: z.string().trim().min(1).max(160).optional(),
})

export const DocumentEmailPrepareQuerySchema = z.strictObject({
  senderId: z.string().trim().min(1).optional(),
  templateId: z.string().trim().min(1).optional(),
})

export const DocumentEmailSendSchema = z.strictObject({
  senderId: z.string().trim().min(1),
  templateId: z.string().trim().min(1).nullable().optional(),
  to: z.array(DocumentEmailRecipientSchema).min(1).max(50),
  cc: z.array(DocumentEmailRecipientSchema).max(50).optional().default([]),
  bcc: z.array(DocumentEmailRecipientSchema).max(50).optional().default([]),
  subject: headerText,
  html: z.string().min(1),
  text: z.string().nullable().optional(),
})

const DocumentEmailSenderSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  replyTo: z.email().nullable(),
})

export const DocumentEmailCompositionResponseSchema = z.strictObject({
  object: z.literal('document_email_composition'),
  resourceType: z.enum(['invoice', 'quote']),
  resourceId: z.string(),
  sender: DocumentEmailSenderSchema,
  senderOptions: z.array(
    DocumentEmailSenderSchema.extend({ isDefault: z.boolean() })
  ),
  to: z.array(DocumentEmailRecipientSchema),
  cc: z.array(DocumentEmailRecipientSchema),
  bcc: z.array(DocumentEmailRecipientSchema),
  templateId: z.string().nullable(),
  templateOptions: z.array(
    z.strictObject({
      id: z.string(),
      name: z.string(),
      isDefault: z.boolean(),
      isSystem: z.boolean(),
      senderId: z.string().nullable(),
    })
  ),
  subject: z.string(),
  html: z.string(),
  text: z.string().nullable(),
})

export const DocumentEmailDeliveryResponseSchema = z.strictObject({
  object: z.literal('document_email_delivery'),
  resourceType: z.enum(['invoice', 'quote']),
  resourceId: z.string(),
  deliveryId: z.string(),
  providerMessageId: z.string().nullable(),
  status: z.string(),
  sentAt: z.number().nullable(),
})

export type DocumentEmailPrepareQuery = z.infer<
  typeof DocumentEmailPrepareQuerySchema
>
export type DocumentEmailSendBody = z.infer<typeof DocumentEmailSendSchema>
