import { z } from 'zod'

import type {
  DeletedPaymentMethod,
  PaymentMethod,
  PaymentMethodList,
} from './payment-method'
import { deletedResourceSchema, listSchema } from './common.schema'

/** Deliberately strict: a credential relation is never a client-safe response field. */
export const PaymentMethodSchema = z.strictObject({
  object: z.literal('payment_method'),
  id: z.string().min(1),
  tenantId: z.string().min(1),
  customerId: z.string().min(1),
  type: z.enum(['CARD', 'BANK_ACCOUNT', 'WALLET', 'MANUAL']),
  status: z.enum([
    'PENDING',
    'ACTIVE',
    'REQUIRES_ACTION',
    'EXPIRED',
    'DETACHED',
    'FAILED',
  ]),
  allowRedisplay: z.enum(['ALWAYS', 'LIMITED', 'UNSPECIFIED']),
  reusable: z.boolean(),
  isDefault: z.boolean(),
  billingDetails: z.unknown().nullable(),
  card: z.unknown().nullable(),
  bankAccount: z.unknown().nullable(),
  wallet: z.unknown().nullable(),
  manual: z.unknown().nullable(),
  fingerprint: z.string().nullable(),
  displayLabel: z.string().nullable(),
  expMonth: z.number().int().nullable(),
  expYear: z.number().int().nullable(),
  provider: z.string().nullable(),
  providerPaymentMethodId: z.string().nullable(),
  providerConnectionId: z.string().nullable(),
  detachedAt: z.number().int().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<PaymentMethod>

export const PaymentMethodListSchema = listSchema(
  PaymentMethodSchema
) satisfies z.ZodType<PaymentMethodList>

export const DeletedPaymentMethodSchema = deletedResourceSchema(
  'payment_method'
) satisfies z.ZodType<DeletedPaymentMethod>
