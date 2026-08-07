import { z } from 'zod'

import { paginationQuerySchema } from '@/http/envelope'

/**
 * Outbound messaging, voice, and phone lookup.
 *
 * Message and call bodies are server-owned: a caller selects a semantic
 * template key and never supplies content, a URL, or a provider identifier.
 * That is why no request schema here carries a `body` field.
 */

export const phoneLookupSchema = z
  .object({
    object: z
      .literal('phone_lookup')
      .meta({ description: "Always 'phone_lookup'." }),
    valid: z.boolean(),
    e164: z.string().nullable(),
    national_format: z.string().nullable(),
    country_code: z.string().nullable(),
    carrier_name: z.string().nullable(),
    line_type: z.string().nullable(),
    mobile_country_code: z.string().nullable(),
    mobile_network_code: z.string().nullable(),
    line_type_requested: z.boolean(),
    created_at: z.number().int(),
  })
  .meta({ id: 'PhoneLookup' })

export const communicationMessageSchema = z
  .object({
    object: z
      .literal('communication_message')
      .meta({ description: "Always 'communication_message'." }),
    id: z.string(),
    provider: z.string(),
    provider_sid: z.string().nullable(),
    channel: z.string(),
    direction: z.string(),
    status: z.string(),
    to_number: z.string(),
    from_number: z.string().nullable(),
    messaging_service_sid: z.string().nullable(),
    content_sid: z.string().nullable(),
    template_key: z.string().nullable(),
    body_preview: z.string().nullable(),
    body_hash: z.string(),
    user_id: z.string().nullable(),
    organization_id: z.string().nullable(),
    app_id: z.string().nullable(),
    client_reference: z.string().nullable(),
    idempotency_key: z.string(),
    provider_error_code: z.string().nullable(),
    sent_at: z.number().int().nullable(),
    delivered_at: z.number().int().nullable(),
    read_at: z.number().int().nullable(),
    failed_at: z.number().int().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'CommunicationMessage' })

export const communicationCallSchema = z
  .object({
    object: z
      .literal('communication_call')
      .meta({ description: "Always 'communication_call'." }),
    id: z.string(),
    provider: z.string(),
    provider_sid: z.string().nullable(),
    direction: z.string(),
    status: z.string(),
    to_number: z.string(),
    from_number: z.string().nullable(),
    template_key: z.string(),
    user_id: z.string().nullable(),
    organization_id: z.string().nullable(),
    app_id: z.string().nullable(),
    client_reference: z.string().nullable(),
    idempotency_key: z.string(),
    duration_seconds: z.number().int().nullable(),
    provider_error_code: z.string().nullable(),
    started_at: z.number().int().nullable(),
    answered_at: z.number().int().nullable(),
    completed_at: z.number().int().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'CommunicationCall' })

/**
 * Requests are camelCase, not snake_case.
 *
 * This is the one place the platform's `snake_case` wire rule does not apply,
 * and it is not a choice: the Pydantic models declare `alias="toNumber"` on
 * every field, so camelCase is what callers already send. Responses stay
 * `snake_case` like every other resource. Keeping the request shape means an
 * existing caller needs no change at cutover.
 */
export const createPhoneLookupBodySchema = z.strictObject({
  number: z.string().min(1).max(64),
  includeLineType: z.boolean().default(false),
})

/** The addressing and attribution fields every send shares. */
const sendTargetShape = {
  toNumber: z.string().min(1).max(64),
  templateKey: z.string().min(1).max(100),
  idempotencyKey: z.string().min(1).max(255),
  userId: z.string().nullish().default(null),
  organizationId: z.string().nullish().default(null),
  appId: z.string().nullish().default(null),
  clientReference: z.string().max(255).nullish().default(null),
}

export const createMessageBodySchema = z.strictObject({
  ...sendTargetShape,
  channel: z.enum(['sms', 'whatsapp']),
})

export const createCallBodySchema = z.strictObject(sendTargetShape)

export const listCommunicationsQuerySchema = paginationQuerySchema.extend({
  status: z.string().optional(),
})

export const messageIdParamsSchema = z.strictObject({ message_id: z.string() })
export const callIdParamsSchema = z.strictObject({ call_id: z.string() })

export type PhoneLookup = z.infer<typeof phoneLookupSchema>
export type CommunicationMessage = z.infer<typeof communicationMessageSchema>
export type CommunicationCall = z.infer<typeof communicationCallSchema>
export type CreatePhoneLookupBody = z.infer<typeof createPhoneLookupBodySchema>
export type CreateMessageBody = z.infer<typeof createMessageBodySchema>
export type CreateCallBody = z.infer<typeof createCallBodySchema>
export type ListCommunicationsQuery = z.infer<
  typeof listCommunicationsQuerySchema
>
