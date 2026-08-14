import { z } from 'zod'

export const paymentProviderSchema = z.object({
  object: z.literal('payment_provider'),
  id: z.string(),
  key: z.string(),
  name: z.string(),
  logoUrl: z.string().nullable(),
  adapter: z.string(),
  isActive: z.boolean(),
})
export const providerEnvironmentSchema = z.enum(['SANDBOX', 'LIVE'])
export const providerConnectionStatusSchema = z.enum([
  'PENDING',
  'ACTIVE',
  'DISABLED',
  'ERROR',
])
export const providerConnectionSchema = z.object({
  object: z.literal('payment_provider_connection'),
  id: z.string(),
  providerId: z.string(),
  name: z.string(),
  environment: providerEnvironmentSchema,
  status: providerConnectionStatusSchema,
  merchantAccountId: z.string().nullable(),
  lastSyncedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export const providerConnectionCreateBodySchema = z.strictObject({
  providerId: z.string().min(1),
  name: z.string().trim().min(1),
  environment: providerEnvironmentSchema.optional().default('SANDBOX'),
  merchantAccountId: z.string().trim().min(1).nullable().optional(),
  credentialsReference: z.string().trim().min(1).nullable().optional(),
  webhookSecretReference: z.string().trim().min(1).nullable().optional(),
  settings: z.record(z.string(), z.json()).nullable().optional(),
})
export const providerConnectionUpdateBodySchema = z
  .strictObject({
    name: z.string().trim().min(1).optional(),
    status: providerConnectionStatusSchema.optional(),
    merchantAccountId: z.string().trim().min(1).nullable().optional(),
    credentialsReference: z.string().trim().min(1).nullable().optional(),
    webhookSecretReference: z.string().trim().min(1).nullable().optional(),
    settings: z.record(z.string(), z.json()).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Nothing to update.',
  })
export const providerConnectionParamsSchema = z.object({
  connectionId: z.string().min(1),
})
export type ProviderConnectionCreateBody = z.infer<
  typeof providerConnectionCreateBodySchema
>
export type ProviderConnectionUpdateBody = z.infer<
  typeof providerConnectionUpdateBodySchema
>
