import { z } from 'zod'

/** WorkOS event payloads retain all event-specific data for forward compatibility. */
export const workosWebhookEventSchema = z.object({
  id: z.string(),
  event: z.string(),
  data: z.record(z.string(), z.unknown()),
  createdAt: z.string().optional(),
})

export type WorkosWebhookEvent = z.infer<typeof workosWebhookEventSchema>

export const webhookProcessedSchema = z.object({
  object: z.literal('workos_webhook_event'),
  received: z.literal(true),
  event: z.string(),
  applied: z.boolean(),
})
