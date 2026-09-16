import { z } from 'zod'

export const webhookEventTypeSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9*][a-z0-9.*:-]*$/)

export const webhookUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .refine((url) => url.startsWith('https://'), {
    message: 'Webhook URLs must use https.',
  })

export const createWebhookEndpointBodySchema = z.strictObject({
  url: webhookUrlSchema,
  eventTypes: z.array(webhookEventTypeSchema).min(1).max(50),
  secret: z.string().min(16).max(500).optional(),
  enabled: z.boolean().optional(),
})

export type CreateWebhookEndpointBody = z.infer<
  typeof createWebhookEndpointBodySchema
>

export const updateWebhookEndpointBodySchema = z
  .strictObject({
    url: webhookUrlSchema.optional(),
    eventTypes: z.array(webhookEventTypeSchema).min(1).max(50).optional(),
    secret: z.string().min(16).max(500).optional(),
    enabled: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update.',
  })

export type UpdateWebhookEndpointBody = z.infer<
  typeof updateWebhookEndpointBodySchema
>

export const webhookEndpointParamsSchema = z.strictObject({
  endpointId: z.string().trim().min(1),
})

export const webhookDeliveryParamsSchema = z.strictObject({
  deliveryId: z.string().trim().min(1),
})

export const listDeliveriesQuerySchema = z.strictObject({
  endpointId: z.string().trim().min(1).optional(),
  status: z.enum(['pending', 'delivered', 'failed']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export type ListDeliveriesQuery = z.infer<typeof listDeliveriesQuerySchema>
