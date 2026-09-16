import { z } from 'zod'

export interface ClientError {
  code: string
  message: string
}

export type Result<T> =
  { data: T; error: null } | { data: null; error: ClientError }

export interface ClientOptions {
  baseUrl?: string
  internalKey?: string
  fetch?: typeof fetch
  requestId?: string
  actorId?: string
}

export interface RequestOptions {
  signal?: AbortSignal
  actorId?: string
}

/**
 * Mirrors Resend's documented domain-status set, in 876 kebab-case. Verified
 * against the Resend OpenAPI domain-status enum
 * (not_started | pending | verified | partially_verified | partially_failed |
 * failed) on 2026-09-16. Only `verified` may send.
 *
 * `not-started` and `pending` are deliberately distinct: the first means the
 * organization has not asked for verification yet and must act, the second means
 * verification is genuinely in flight and it should wait.
 */
export const emailDomainStatusSchema = z.enum([
  'not-started',
  'pending',
  'partially-verified',
  'partially-failed',
  'verified',
  'failed',
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
  // What the record is for (SPF, DKIM, tracking), as opposed to `type`, which is
  // only the DNS record kind. Several records share a name or a type, so without
  // this a setup screen cannot label or group them.
  purpose: z.string().optional(),
  status: z.string().optional(),
  ttl: z.string().optional(),
  priority: z.number().optional(),
})
export type EmailDomainRecord = z.infer<typeof emailDomainRecordSchema>

export const emailDomainSchema = z.object({
  object: z.literal('email_domain'),
  id: z.string(),
  organizationId: z.string(),
  provider: z.literal('resend'),
  name: z.string(),
  region: z.string().nullable(),
  status: emailDomainStatusSchema,
  records: z.array(emailDomainRecordSchema),
  verifiedAt: z.number().nullable(),
  lastCheckedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type EmailDomain = z.infer<typeof emailDomainSchema>

export const emailSenderSchema = z.object({
  object: z.literal('email_sender'),
  id: z.string(),
  organizationId: z.string(),
  domainId: z.string().nullable(),
  name: z.string(),
  email: z.string(),
  replyTo: z.string().nullable(),
  kind: emailSenderKindSchema,
  isDefault: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type EmailSender = z.infer<typeof emailSenderSchema>

export const emailTemplateSchema = z.object({
  object: z.literal('email_template'),
  id: z.string(),
  organizationId: z.string().nullable(),
  key: z.string(),
  name: z.string(),
  category: z.string(),
  subject: z.string(),
  html: z.string(),
  text: z.string().nullable(),
  senderId: z.string().nullable(),
  isDefault: z.boolean(),
  isSystem: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type EmailTemplate = z.infer<typeof emailTemplateSchema>

export const emailCompositionSchema = z.object({
  object: z.literal('email_composition'),
  templateId: z.string(),
  senderId: z.string().nullable(),
  subject: z.string(),
  html: z.string(),
  text: z.string().nullable(),
})
export type EmailComposition = z.infer<typeof emailCompositionSchema>

export const emailRecipientSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
})
export type EmailRecipient = z.infer<typeof emailRecipientSchema>

export const emailDeliverySchema = z.object({
  object: z.literal('email_delivery'),
  id: z.string(),
  organizationId: z.string(),
  resourceType: z.string().nullable(),
  resourceId: z.string().nullable(),
  templateId: z.string().nullable(),
  senderId: z.string().nullable(),
  provider: z.literal('resend'),
  providerMessageId: z.string().nullable(),
  idempotencyKey: z.string(),
  fromName: z.string(),
  fromEmail: z.string(),
  replyTo: z.string().nullable(),
  to: z.array(emailRecipientSchema),
  cc: z.array(emailRecipientSchema),
  bcc: z.array(emailRecipientSchema),
  subject: z.string(),
  status: emailDeliveryStatusSchema,
  failureCode: z.string().nullable(),
  failureMessage: z.string().nullable(),
  queuedAt: z.number().nullable(),
  sentAt: z.number().nullable(),
  deliveredAt: z.number().nullable(),
  openedAt: z.number().nullable(),
  clickedAt: z.number().nullable(),
  bouncedAt: z.number().nullable(),
  complainedAt: z.number().nullable(),
  failedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type EmailDelivery = z.infer<typeof emailDeliverySchema>

export const deletedEmailDomainSchema = z.object({
  object: z.literal('email_domain'),
  id: z.string(),
  deleted: z.literal(true),
})

export const deletedEmailSenderSchema = z.object({
  object: z.literal('email_sender'),
  id: z.string(),
  deleted: z.literal(true),
})

export const deletedEmailTemplateSchema = z.object({
  object: z.literal('email_template'),
  id: z.string(),
  deleted: z.literal(true),
})

function listSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    object: z.literal('list'),
    data: z.array(item),
    has_more: z.boolean(),
    total_count: z.number().nullable(),
    url: z.string(),
  })
}

export const emailDomainListSchema = listSchema(emailDomainSchema)
export const emailSenderListSchema = listSchema(emailSenderSchema)
export const emailTemplateListSchema = listSchema(emailTemplateSchema)
export const emailDeliveryListSchema = listSchema(emailDeliverySchema)

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
export type CreateEmailDomainInput = z.infer<typeof createEmailDomainSchema>

export const createEmailSenderSchema = z.object({
  name: headerTextSchema.max(160),
  email: z.string().email(),
  replyTo: z.string().email().nullable().optional(),
  domainId: z.string().trim().min(1).nullable().optional(),
  kind: emailSenderKindSchema,
  isDefault: z.boolean().optional().default(false),
})
// z.input, not z.infer: fields with a Zod default are required in the output
// type but optional for a caller. Using z.infer forces every call site to pass
// values the schema would have supplied.
export type CreateEmailSenderInput = z.input<typeof createEmailSenderSchema>
/** Post-validation shape, with schema defaults applied. What a service receives. */
export type CreateEmailSenderValues = z.output<typeof createEmailSenderSchema>

/**
 * Input for provisioning an organization's free `managed` sender.
 *
 * Note what is absent: there is no `email`, no `localPart`, and no `domainId`.
 * The address is derived server-side from the organization's durable slug, so a
 * caller cannot choose or spoof an address on the shared platform sending
 * domain. See the email rule's sending-identity section.
 */
export const ensureManagedSenderSchema = z.object({
  organizationName: headerTextSchema.max(160),
  organizationSlug: z.string().trim().min(1).max(120),
  replyTo: z.string().email().nullable().optional(),
})
export type EnsureManagedSenderInput = z.infer<typeof ensureManagedSenderSchema>

export const updateEmailSenderSchema = createEmailSenderSchema
  .omit({ kind: true })
  .partial()
  .extend({ isActive: z.boolean().optional() })
export type UpdateEmailSenderInput = z.infer<typeof updateEmailSenderSchema>

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
export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>

export const updateEmailTemplateSchema = createEmailTemplateSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>

export const renderEmailTemplateSchema = z.object({
  variables: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()])
  ),
})
export type RenderEmailTemplateInput = z.infer<typeof renderEmailTemplateSchema>

/**
 * Resend documents a maximum of 50 `to` recipients per send, and counts every
 * `to`, `cc` and `bcc` address separately against the sending quota. Verified
 * 2026-09-16. Capping the combined total at 50 therefore keeps one send within
 * the documented bound instead of allowing 150 addresses — which the provider
 * would bill as 150 emails.
 */
const MAX_RECIPIENTS_PER_SEND = 50

/** Subject line bound from RFC 5322's 998-octet line limit. */
const MAX_SUBJECT_LENGTH = 998

/**
 * Resend rejects an idempotency key outside 1–256 characters with
 * `invalid_idempotency_key`. Keys are retained for 24 hours, and replaying one
 * with a *different* body is rejected rather than sent — so a "resend with a
 * correction" path must derive a new key rather than reuse the stored one.
 */
const MAX_IDEMPOTENCY_KEY_LENGTH = 256

/**
 * An HTML body has no documented provider maximum, but an unbounded field is not
 * acceptable in a contract: the only thing otherwise limiting it is the HTTP body
 * limit, which is incidental rather than intentional.
 */
const MAX_HTML_LENGTH = 512_000

export const createEmailDeliverySchema = z
  .object({
    senderId: z.string().trim().min(1),
    to: z.array(emailRecipientSchema).min(1).max(MAX_RECIPIENTS_PER_SEND),
    cc: z
      .array(emailRecipientSchema)
      .max(MAX_RECIPIENTS_PER_SEND)
      .optional()
      .default([]),
    bcc: z
      .array(emailRecipientSchema)
      .max(MAX_RECIPIENTS_PER_SEND)
      .optional()
      .default([]),
    subject: headerTextSchema.max(MAX_SUBJECT_LENGTH),
    html: z.string().min(1).max(MAX_HTML_LENGTH),
    text: z.string().max(MAX_HTML_LENGTH).optional(),
    resourceType: z.string().trim().min(1).max(80).optional(),
    resourceId: z.string().trim().min(1).max(200).optional(),
    templateId: z.string().trim().min(1).optional(),
    idempotencyKey: z.string().trim().min(1).max(MAX_IDEMPOTENCY_KEY_LENGTH),
  })
  .refine(
    (value) =>
      value.to.length + (value.cc?.length ?? 0) + (value.bcc?.length ?? 0) <=
      MAX_RECIPIENTS_PER_SEND,
    {
      message: `A single send may address at most ${MAX_RECIPIENTS_PER_SEND} recipients across to, cc and bcc.`,
      path: ['to'],
    }
  )
export type CreateEmailDeliveryInput = z.input<typeof createEmailDeliverySchema>
/** Post-validation shape, with schema defaults applied. What a service receives. */
export type CreateEmailDeliveryValues = z.output<
  typeof createEmailDeliverySchema
>

export interface ListEmailDeliveriesQuery extends RequestOptions {
  limit?: number
}
