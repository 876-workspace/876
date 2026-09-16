import { z } from 'zod'

export const emailDomainStatusSchema = z.enum([
  'pending',
  'verified',
  'failed',
  'temporary-failure',
])
export type EmailDomainStatus = z.infer<typeof emailDomainStatusSchema>

export const emailSenderKindSchema = z.enum(['managed', 'custom-domain'])
export type EmailSenderKind = z.infer<typeof emailSenderKindSchema>

export const emailDeliveryStatusSchema = z.enum([
  'queued',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'bounced',
  'complained',
  'failed',
])
export type EmailDeliveryStatus = z.infer<typeof emailDeliveryStatusSchema>

export const emailDomainRecordSchema = z.object({
  name: z.string(),
  type: z.string(),
  value: z.string(),
  status: z.string().optional(),
  ttl: z.string().optional(),
  priority: z.number().optional(),
})
export type EmailDomainRecord = z.infer<typeof emailDomainRecordSchema>

export type EmailDomainObject = {
  object: 'email_domain'
  id: string
  organizationId: string
  provider: 'resend'
  name: string
  region: string | null
  status: EmailDomainStatus
  records: EmailDomainRecord[]
  verifiedAt: number | null
  lastCheckedAt: number | null
  createdAt: number
  updatedAt: number
}

export type EmailSenderObject = {
  object: 'email_sender'
  id: string
  organizationId: string
  domainId: string | null
  name: string
  email: string
  replyTo: string | null
  kind: EmailSenderKind
  isDefault: boolean
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export type EmailTemplateObject = {
  object: 'email_template'
  id: string
  organizationId: string | null
  key: string
  name: string
  category: string
  subject: string
  html: string
  text: string | null
  senderId: string | null
  isDefault: boolean
  isSystem: boolean
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export type EmailRecipient = {
  email: string
  name?: string
}

export type EmailDeliveryObject = {
  object: 'email_delivery'
  id: string
  organizationId: string
  resourceType: string | null
  resourceId: string | null
  templateId: string | null
  senderId: string | null
  provider: 'resend'
  providerMessageId: string | null
  idempotencyKey: string
  fromName: string
  fromEmail: string
  replyTo: string | null
  to: EmailRecipient[]
  cc: EmailRecipient[]
  bcc: EmailRecipient[]
  subject: string
  status: EmailDeliveryStatus
  failureCode: string | null
  failureMessage: string | null
  queuedAt: number | null
  sentAt: number | null
  deliveredAt: number | null
  openedAt: number | null
  clickedAt: number | null
  bouncedAt: number | null
  complainedAt: number | null
  failedAt: number | null
  createdAt: number
  updatedAt: number
}

const headerTextSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !/[\r\n]/.test(value), 'Line breaks are not allowed.')

const domainNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(253)
  .regex(
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
    'Enter a valid domain name.'
  )

export const createEmailDomainSchema = z.object({
  name: domainNameSchema,
  region: z.string().trim().min(1).max(64).optional(),
})

export const createEmailSenderSchema = z.object({
  name: headerTextSchema.max(160),
  email: z.email(),
  replyTo: z.email().nullable().optional(),
  domainId: z.string().trim().min(1).nullable().optional(),
  kind: emailSenderKindSchema,
  isDefault: z.boolean().optional().default(false),
})

export const updateEmailSenderSchema = createEmailSenderSchema
  .omit({ kind: true })
  .partial()
  .extend({ isActive: z.boolean().optional() })

export const createEmailTemplateSchema = z.object({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9][a-z0-9.-]*$/),
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().toLowerCase().min(1).max(120),
  subject: headerTextSchema.max(998),
  html: z.string().min(1),
  text: z.string().nullable().optional(),
  senderId: z.string().trim().min(1).nullable().optional(),
  isDefault: z.boolean().optional().default(false),
})

export const updateEmailTemplateSchema = createEmailTemplateSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export const renderEmailTemplateSchema = z.object({
  variables: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()])
  ),
})

export const emailRecipientSchema = z.object({
  email: z.email(),
  name: headerTextSchema.max(160).optional(),
})

export const createEmailDeliverySchema = z.object({
  senderId: z.string().trim().min(1),
  to: z.array(emailRecipientSchema).min(1).max(50),
  cc: z.array(emailRecipientSchema).max(50).optional().default([]),
  bcc: z.array(emailRecipientSchema).max(50).optional().default([]),
  subject: headerTextSchema.max(998),
  html: z.string().min(1),
  text: z.string().optional(),
  resourceType: z.string().trim().min(1).max(80).optional(),
  resourceId: z.string().trim().min(1).max(200).optional(),
  templateId: z.string().trim().min(1).optional(),
  idempotencyKey: z.string().trim().min(1).max(256),
})

export type CreateEmailDomainInput = z.infer<typeof createEmailDomainSchema>
export type CreateEmailSenderInput = z.infer<typeof createEmailSenderSchema>
export type UpdateEmailSenderInput = z.infer<typeof updateEmailSenderSchema>
export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>
export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>
export type RenderEmailTemplateInput = z.infer<typeof renderEmailTemplateSchema>
export type CreateEmailDeliveryInput = z.infer<typeof createEmailDeliverySchema>
