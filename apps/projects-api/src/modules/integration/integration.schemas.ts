import { z } from 'zod'

export const INTEGRATION_SCOPES = [
  'projects:read',
  'projects:write',
  'time:read',
  'time:write',
  'webhooks:manage',
] as const

export const integrationScopeSchema = z.enum(INTEGRATION_SCOPES)
export type IntegrationScope = z.infer<typeof integrationScopeSchema>

export const createIntegrationClientBodySchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  scopes: z.array(integrationScopeSchema).min(1).max(INTEGRATION_SCOPES.length),
})

export type CreateIntegrationClientBody = z.infer<
  typeof createIntegrationClientBodySchema
>

export const listIntegrationClientsQuerySchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const integrationClientParamsSchema = z.strictObject({
  clientId: z.string().trim().min(1),
})
