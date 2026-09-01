import { z } from 'zod'

export const accountingConnectionModeSchema = z.enum([
  'native',
  'mirror',
  'provider-backed',
])
export const accountingConnectionStatusSchema = z.enum([
  'pending',
  'active',
  'disabled',
  'error',
])
export const accountingProviderEnvironmentSchema = z.enum(['sandbox', 'live'])

export const accountingCapabilitiesSchema = z.strictObject({
  customers: z.boolean(),
  items: z.boolean(),
  estimates: z.boolean(),
  invoices: z.boolean(),
  recurringInvoices: z.boolean(),
  paymentsReceived: z.boolean(),
  imports: z.boolean(),
  webhooks: z.boolean(),
})

export const accountingProviderSchema = z.strictObject({
  object: z.literal('accounting-provider'),
  id: z.string(),
  key: z.string(),
  name: z.string(),
  adapter: z.string(),
  capabilities: accountingCapabilitiesSchema,
  isActive: z.boolean(),
})

export const accountingConnectionSchema = z.strictObject({
  object: z.literal('accounting-provider-connection'),
  id: z.string(),
  providerId: z.string(),
  providerKey: z.string(),
  name: z.string(),
  environment: accountingProviderEnvironmentSchema,
  status: accountingConnectionStatusSchema,
  mode: accountingConnectionModeSchema,
  providerOrganizationId: z.string().nullable(),
  apiDomain: z.string().nullable(),
  scopes: z.array(z.string()),
  lastSyncedAt: z.number().int().nullable(),
  lastSuccessfulSyncAt: z.number().int().nullable(),
  lastErrorCode: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const accountingConnectionCreateBodySchema = z.strictObject({
  providerId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  environment: accountingProviderEnvironmentSchema.optional().default('live'),
  mode: accountingConnectionModeSchema.optional().default('mirror'),
})

export const accountingConnectionUpdateBodySchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120).optional(),
    status: accountingConnectionStatusSchema.optional(),
    mode: accountingConnectionModeSchema.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Nothing to update.',
  })

export const organizationAccountingParamsSchema = z.object({
  organizationId: z.string().min(1),
})
export const accountingConnectionParamsSchema = z.object({
  organizationId: z.string().min(1),
  connectionId: z.string().min(1),
})
export const zohoOauthCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  location: z.string().optional(),
  'accounts-server': z.string().url().optional(),
})
export const accountingAuthorizationSchema = z.strictObject({
  object: z.literal('accounting-provider-authorization'),
  connectionId: z.string(),
  authorizeUrl: z.string().url(),
  expiresAt: z.number().int(),
})
export const accountingConnectionDeletedSchema = z.strictObject({
  object: z.literal('accounting-provider-connection'),
  id: z.string(),
  deleted: z.literal(true),
})

export type AccountingConnectionCreateBody = z.infer<
  typeof accountingConnectionCreateBodySchema
>
export type AccountingConnectionUpdateBody = z.infer<
  typeof accountingConnectionUpdateBodySchema
>
export type ZohoOauthCallbackQuery = z.infer<typeof zohoOauthCallbackQuerySchema>
