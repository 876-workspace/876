import { z } from 'zod'

import { IdSchema, optionalShortTextSchema } from './common'

const providerSettingsSchema = z
  .record(z.string(), z.json())
  .refine(
    (settings) =>
      Object.keys(settings).every(
        (key) => !/(?:secret|password|token|api.?key|credential)/i.test(key)
      ),
    'Store credentials in a secret manager and provide only their reference.'
  )

export const PaymentProviderConnectionCreateSchema = z.strictObject({
  providerId: IdSchema,
  name: z.string().trim().min(1).max(160),
  environment: z.enum(['SANDBOX', 'LIVE']).default('SANDBOX'),
  merchantAccountId: optionalShortTextSchema,
  credentialsReference: optionalShortTextSchema,
  webhookSecretReference: optionalShortTextSchema,
  settings: providerSettingsSchema.nullable().optional(),
})

export const PaymentProviderConnectionUpdateSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(160).optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'DISABLED', 'ERROR']).optional(),
    merchantAccountId: optionalShortTextSchema,
    credentialsReference: optionalShortTextSchema,
    webhookSecretReference: optionalShortTextSchema,
    settings: providerSettingsSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update.')

export type PaymentProviderConnectionCreateParams = z.infer<
  typeof PaymentProviderConnectionCreateSchema
>
export type PaymentProviderConnectionCreateInput = z.input<
  typeof PaymentProviderConnectionCreateSchema
>
export type PaymentProviderConnectionUpdateParams = z.infer<
  typeof PaymentProviderConnectionUpdateSchema
>
