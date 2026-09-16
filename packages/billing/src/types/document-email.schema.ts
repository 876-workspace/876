import { z } from 'zod'

const recipient = z.object({
  email: z.string().email(),
  name: z.string().optional(),
})

const sender = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  replyTo: z.string().email().nullable(),
})

const senderOption = sender.extend({ isDefault: z.boolean() })

const templateOption = z.object({
  id: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  isSystem: z.boolean(),
  senderId: z.string().nullable(),
})

export const DocumentEmailCompositionSchema = z.object({
  object: z.literal('document_email_composition'),
  resourceType: z.enum(['invoice', 'quote']),
  resourceId: z.string(),
  sender,
  senderOptions: z.array(senderOption),
  to: z.array(recipient),
  cc: z.array(recipient),
  bcc: z.array(recipient),
  templateId: z.string().nullable(),
  templateOptions: z.array(templateOption),
  subject: z.string(),
  html: z.string(),
  text: z.string().nullable(),
})

export const DocumentEmailDeliverySchema = z.object({
  object: z.literal('document_email_delivery'),
  resourceType: z.enum(['invoice', 'quote']),
  resourceId: z.string(),
  deliveryId: z.string(),
  providerMessageId: z.string().nullable(),
  status: z.string(),
  sentAt: z.number().nullable(),
})
