import { z } from 'zod'

import type {
  PaymentProvider,
  PaymentProviderConnection,
} from './payment-provider'
import { createdResourceSchema, listSchema } from './common.schema'

/**
 * The schema for a payment provider resource.
 */
export const PaymentProviderSchema = z.object({
  object: z.literal('payment_provider'),
  id: z.string().min(1),
  key: z.string(),
  name: z.string(),
  logoUrl: z.string().nullable(),
  adapter: z.string(),
  isActive: z.boolean(),
}) satisfies z.ZodType<PaymentProvider>

/**
 * The schema for a created payment provider connection response.
 */
export const PaymentProviderConnectionCreatedSchema = createdResourceSchema(
  'payment_provider_connection'
)

/**
 * The schema for a payment provider connection resource.
 */
export const PaymentProviderConnectionSchema = z.object({
  object: z.literal('payment_provider_connection'),
  id: z.string().min(1),
  providerId: z.string().min(1),
  name: z.string(),
  environment: z.enum(['SANDBOX', 'LIVE']),
  status: z.enum(['PENDING', 'ACTIVE', 'DISABLED', 'ERROR']),
  merchantAccountId: z.string().nullable(),
  lastSyncedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<PaymentProviderConnection>

/**
 * The schema for a paginated list of payment providers.
 */
export const PaymentProviderListSchema = listSchema(PaymentProviderSchema)

/**
 * The schema for a paginated list of payment provider connections.
 */
export const PaymentProviderConnectionListSchema = listSchema(
  PaymentProviderConnectionSchema
)
