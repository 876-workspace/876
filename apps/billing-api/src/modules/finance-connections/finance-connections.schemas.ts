import { z } from 'zod'

export const financeConnectionScopeSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/)

export const financeProvisioningEventSchema = z.strictObject({
  eventId: z.string().min(1).max(191),
  eventType: z.literal('finance_connection.ensure'),
  contractVersion: z.literal(1),
  aggregateId: z.string().min(1).max(191),
  organization: z.strictObject({
    id: z.string().min(1).max(191),
    name: z.string().trim().min(1).max(160),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]{2,80}$/),
    countryCode: z.string().length(2).nullable(),
    currencyCode: z.string().length(3),
  }),
  sourceAppId: z.string().min(1).max(191),
  entitlementReference: z.string().min(1).max(191),
  manifestVersion: z.literal(1),
  provisioningRevision: z.number().int().positive(),
  lifecycleVersion: z.number().int().positive(),
  desiredStatus: z.enum(['ACTIVE', 'SUSPENDED', 'REVOKED']),
  scopes: z
    .array(financeConnectionScopeSchema)
    .min(1)
    .max(100)
    .refine((scopes) => new Set(scopes).size === scopes.length, {
      message: 'Finance scopes must be unique.',
    }),
  occurredAt: z.number().int().positive(),
})

export const financeProvisioningResultSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'REVOKED']),
  lifecycleVersion: z.number().int(),
  applied: z.boolean(),
  duplicate: z.boolean(),
})

export const sourceAppParamsSchema = z.object({ sourceAppId: z.string() })
export const organizationParamsSchema = z.object({ organizationId: z.string() })

export const billingAppStatsSchema = z.object({
  object: z.literal('billing_app_stats'),
  sourceAppId: z.string().nullable(),
  connections: z.number().int(),
  customers: z.number().int(),
  invoices: z.number().int(),
  subscriptions: z.number().int(),
})

export type FinanceProvisioningEvent = z.infer<
  typeof financeProvisioningEventSchema
>
