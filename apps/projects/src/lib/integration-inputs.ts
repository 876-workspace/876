import { z } from 'zod'

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024

export const integrationScopeSchema = z.enum([
  'projects:read',
  'projects:write',
  'time:read',
  'time:write',
  'webhooks:manage',
])

export type IntegrationScopeInput = z.infer<typeof integrationScopeSchema>

export const createIntegrationClientInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  scopes: z.array(integrationScopeSchema).min(1).max(5),
})

export type CreateIntegrationClientInput = z.infer<
  typeof createIntegrationClientInputSchema
>

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

export const createWebhookEndpointInputSchema = z.strictObject({
  url: webhookUrlSchema,
  eventTypes: z.array(webhookEventTypeSchema).min(1).max(50),
  secret: z.string().min(16).max(500).optional(),
  enabled: z.boolean().optional(),
})

export type CreateWebhookEndpointInput = z.infer<
  typeof createWebhookEndpointInputSchema
>

export const updateWebhookEndpointInputSchema = z
  .strictObject({
    url: webhookUrlSchema.optional(),
    eventTypes: z.array(webhookEventTypeSchema).min(1).max(50).optional(),
    secret: z.string().min(16).max(500).optional(),
    enabled: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update.',
  })

export type UpdateWebhookEndpointInput = z.infer<
  typeof updateWebhookEndpointInputSchema
>

export const listWebhookDeliveriesQuerySchema = z.strictObject({
  endpointId: z.string().trim().min(1).optional(),
  status: z.enum(['pending', 'delivered', 'failed']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export type ListWebhookDeliveriesQuery = z.infer<
  typeof listWebhookDeliveriesQuerySchema
>

export const replayWebhookDeliveryInputSchema = z.strictObject({})

export const importSourceSchema = z.enum([
  'csv',
  'jira-csv',
  'jira-json',
  'trello-json',
  'asana-csv',
  'zoho-csv',
])

export type ImportSourceInput = z.infer<typeof importSourceSchema>

function withinImportLimit(content: string): boolean {
  return Buffer.byteLength(content, 'utf8') <= MAX_IMPORT_BYTES
}

export const createImportJobInputSchema = z.strictObject({
  source: importSourceSchema,
  projectId: z.string().trim().min(1).nullable().optional(),
  filename: z.string().trim().max(255).nullable().optional(),
  content: z
    .string()
    .min(1)
    .refine(withinImportLimit, {
      message: 'Import files must be 5 MB or smaller.',
    }),
})

export type CreateImportJobInput = z.infer<typeof createImportJobInputSchema>

export const exportWorkItemsQuerySchema = z.strictObject({
  project: z.string().trim().min(1).optional(),
})

export type ExportWorkItemsQuery = z.infer<typeof exportWorkItemsQuerySchema>

export const exportTimeEntriesQuerySchema = z.strictObject({
  projectId: z.string().trim().min(1).optional(),
  userId: z.string().trim().min(1).optional(),
  from: z.coerce.number().int().nonnegative().optional(),
  to: z.coerce.number().int().nonnegative().optional(),
})

export type ExportTimeEntriesQuery = z.infer<typeof exportTimeEntriesQuerySchema>
