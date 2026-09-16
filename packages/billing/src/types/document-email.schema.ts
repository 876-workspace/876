import { z } from 'zod'

const recipient = z.object({
  email: z.string().email(),
  name: z.string().optional(),
})

export const DocumentEmailCompositionSchema = z.object({
  object: z.literal('document_email_composition'),
  resourceType: z.enum(['invoice', 'quote']),
  resourceId: z.string(),
  sender: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    replyTo: z.string().email().nullable(),
  }),
  to: z.array(recipient),
  cc: z.array(recipient),
  bcc: z.array(recipient),
  templateId: z.string().nullable(),
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
