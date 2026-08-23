import { z } from 'zod'

const json = z.record(z.string(), z.unknown())
const check = z.enum(['pass', 'fail', 'unavailable', 'unchecked'])
const card = z.strictObject({
  brand: z.string().min(1),
  displayBrand: z.string().min(1).optional(),
  network: z.string().min(1).optional(),
  funding: z.string().min(1).optional(),
  issuerCountry: z.string().length(2).optional(),
  last4: z.string().regex(/^\d{4}$/),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(2000),
  fingerprint: z.string().min(1).optional(),
  cardholderName: z.string().min(1).optional(),
  checks: z
    .strictObject({
      addressLine1: check.optional(),
      postalCode: check.optional(),
      cvc: check.optional(),
    })
    .optional(),
  networks: z.array(z.string().min(1)).optional(),
  threeDSecureUsage: z.strictObject({ supported: z.boolean() }).optional(),
  wallet: z.record(z.string(), z.unknown()).optional(),
})
const bankAccount = z.strictObject({
  accountHolderType: z.string().min(1).optional(),
  accountType: z.string().min(1).optional(),
  bankName: z.string().min(1).optional(),
  country: z.string().length(2).optional(),
  currency: z.string().length(3).optional(),
  last4: z.string().regex(/^\d{4}$/),
  fingerprint: z.string().min(1).optional(),
  routing: z
    .strictObject({ type: z.string().min(1), masked: z.string().min(1) })
    .optional(),
  status: z.string().min(1).optional(),
})
const manual = z.strictObject({
  method: z.enum([
    'bank_transfer',
    'cash',
    'cheque',
    'wire',
    'mobile_money',
    'point_of_sale',
    'cash_deposit',
    'other',
  ]),
  displayName: z.string().min(1),
  instructions: z.string().optional(),
})
const providerCredential = z.strictObject({
  storage: z.literal('provider_token'),
  provider: z.string().min(1),
  providerConnectionId: z.string().min(1),
  providerToken: z.string().min(1),
})
const vaultCredential = z.strictObject({
  storage: z.literal('vault'),
  value: z.string().min(1),
})
const noneCredential = z.strictObject({ storage: z.literal('none') })
export const paymentMethodCreateSchema = z.strictObject({
  customerId: z.string().min(1),
  type: z.enum(['CARD', 'BANK_ACCOUNT', 'WALLET', 'MANUAL']),
  allowRedisplay: z.enum(['ALWAYS', 'LIMITED', 'UNSPECIFIED']).optional(),
  reusable: z.boolean().optional(),
  billingDetails: json.optional(),
  card: card.optional(),
  bankAccount: bankAccount.optional(),
  wallet: json.optional(),
  manual: manual.optional(),
  metadata: json.optional(),
  credential: z
    .discriminatedUnion('storage', [
      providerCredential,
      vaultCredential,
      noneCredential,
    ])
    .optional(),
})
export const paymentMethodUpdateSchema = z
  .strictObject({
    billingDetails: json.optional(),
    metadata: json.optional(),
    allowRedisplay: z.enum(['ALWAYS', 'LIMITED', 'UNSPECIFIED']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0)
export const paymentMethodListQuerySchema = z.strictObject({
  customerId: z.string().min(1).optional(),
  type: z.enum(['CARD', 'BANK_ACCOUNT', 'WALLET', 'MANUAL']).optional(),
  status: z
    .enum([
      'PENDING',
      'ACTIVE',
      'REQUIRES_ACTION',
      'EXPIRED',
      'DETACHED',
      'FAILED',
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  starting_after: z.string().min(1).optional(),
})
export type PaymentMethodCreateParams = z.infer<
  typeof paymentMethodCreateSchema
>
export type PaymentMethodUpdateParams = z.infer<
  typeof paymentMethodUpdateSchema
>
export type PaymentMethodListQuery = z.infer<
  typeof paymentMethodListQuerySchema
>
