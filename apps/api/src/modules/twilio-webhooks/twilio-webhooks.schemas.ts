import { z } from 'zod'

/**
 * Twilio webhook callbacks.
 *
 * The request body is deliberately **not** validated field by field. Twilio
 * signs every form parameter it sends, including ones this service has never
 * heard of, so the signature can only be recomputed over the payload exactly as
 * received. Stripping unknown fields to satisfy a strict schema would change
 * the string being signed and reject every legitimate callback the moment
 * Twilio adds a parameter.
 *
 * Authentication is therefore the signature, and validation is what the service
 * reads out of the payload — never a schema that discards part of it.
 */

export const twilioCallbackBodySchema = z
  .record(z.string(), z.unknown())
  .meta({ id: 'TwilioCallbackBody' })

export const webhookProcessedSchema = z
  .object({
    processed: z.boolean().meta({
      description:
        'False when the callback was a duplicate, or carried no usable identifier.',
    }),
  })
  .meta({ id: 'WebhookProcessed' })

export const voiceTwimlQuerySchema = z.object({
  template_key: z.string().optional(),
  signature: z.string().optional(),
})

export type WebhookProcessed = z.infer<typeof webhookProcessedSchema>
export type VoiceTwimlQuery = z.infer<typeof voiceTwimlQuerySchema>

/** The form payload, flattened to the `str(key): str(value)` shape Twilio signs. */
export type TwilioPayload = Record<string, string>
