import { z } from 'zod'

import type { PaymentIntent, PaymentIntentList } from './payment-intent'
import { listSchema } from './common.schema'

export const PaymentIntentSchema = z.strictObject({
  object: z.literal('payment_intent'),
  id: z.string().min(1),
  tenantId: z.string().min(1),
  customerId: z.string().min(1),
  invoiceId: z.string().nullable(),
  subscriptionId: z.string().nullable(),
  amount: z.string(),
  amountCapturable: z.string(),
  amountReceived: z.string(),
  currency: z.string().length(3),
  status: z.enum([
    'REQUIRES_PAYMENT_METHOD',
    'REQUIRES_CONFIRMATION',
    'REQUIRES_ACTION',
    'PROCESSING',
    'REQUIRES_CAPTURE',
    'SUCCEEDED',
    'CANCELED',
  ]),
  captureMethod: z.enum(['AUTOMATIC', 'MANUAL']),
  confirmationMethod: z.enum(['AUTOMATIC', 'MANUAL']),
  paymentMethodId: z.string().nullable(),
  mandateId: z.string().nullable(),
  paymentMethodTypes: z.array(z.string()),
  setupFutureUsage: z.string(),
  description: z.string().nullable(),
  receiptEmail: z.string().nullable(),
  statementDescriptor: z.string().nullable(),
  statementDescriptorSuffix: z.string().nullable(),
  lastPaymentError: z.unknown().nullable(),
  nextAction: z.unknown().nullable(),
  processing: z.unknown().nullable(),
  attemptCount: z.number().int(),
  latestPaymentId: z.string().nullable(),
  latestAttemptId: z.string().nullable(),
  canceledAt: z.number().int().nullable(),
  cancellationReason: z.string().nullable(),
  provider: z.string().nullable(),
  providerConnectionId: z.string().nullable(),
  providerIntentId: z.string().nullable(),
  idempotencyKey: z.string().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<PaymentIntent>

export const PaymentIntentListSchema = listSchema(
  PaymentIntentSchema
) satisfies z.ZodType<PaymentIntentList>
