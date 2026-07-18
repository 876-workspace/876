import { z } from 'zod'

import { IdSchema, countryCodeSchema, unixTimestampSchema } from './common'
import { currencyCodeSchema } from './currency'
import {
  AppFinanceConnectionScopeSchema,
  AppFinanceConnectionStatusSchema,
} from './finance-connection'

export const FinanceProvisioningEventSchema = z.strictObject({
  eventId: IdSchema,
  eventType: z.literal('finance_connection.ensure'),
  contractVersion: z.literal(1),
  aggregateId: IdSchema,
  organization: z.strictObject({
    id: IdSchema,
    name: z.string().trim().min(1).max(160),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]{2,80}$/),
    countryCode: countryCodeSchema.nullable(),
    currencyCode: currencyCodeSchema,
  }),
  sourceAppId: IdSchema,
  entitlementReference: IdSchema,
  manifestVersion: z.literal(1),
  provisioningRevision: z.number().int().positive(),
  lifecycleVersion: z.number().int().positive(),
  desiredStatus: AppFinanceConnectionStatusSchema.exclude(['PROVISIONING']),
  scopes: z
    .array(AppFinanceConnectionScopeSchema)
    .min(1)
    .max(100)
    .refine((scopes) => new Set(scopes).size === scopes.length, {
      message: 'Finance scopes must be unique.',
    }),
  occurredAt: unixTimestampSchema,
})

export type FinanceProvisioningEvent = z.infer<
  typeof FinanceProvisioningEventSchema
>

export interface FinanceProvisioningResult {
  id: string
  tenantId: string
  status: Exclude<
    z.infer<typeof AppFinanceConnectionStatusSchema>,
    'PROVISIONING'
  >
  lifecycleVersion: number
  applied: boolean
  duplicate: boolean
}
