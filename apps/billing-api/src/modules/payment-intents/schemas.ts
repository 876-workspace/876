import { z } from 'zod'
const json = z.record(z.string(), z.unknown())
export const paymentIntentCreateSchema = z.strictObject({
  customerId: z.string().min(1),
  amount: z.coerce.bigint().positive(),
  currency: z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase()),
  paymentMethodId: z.string().min(1).optional(),
  invoiceId: z.string().min(1).optional(),
  subscriptionId: z.string().min(1).optional(),
  captureMethod: z.enum(['AUTOMATIC', 'MANUAL']).optional(),
  confirmationMethod: z.enum(['AUTOMATIC', 'MANUAL']).optional(),
  paymentMethodTypes: z.array(z.string().min(1)).optional(),
  description: z.string().max(500).optional(),
  receiptEmail: z.string().email().optional(),
  metadata: json.optional(),
})
export const paymentIntentCancelSchema = z.strictObject({
  cancellationReason: z.string().max(500).optional(),
})
export const paymentIntentListQuerySchema = z.strictObject({
  customerId: z.string().min(1).optional(),
  status: z
    .enum([
      'REQUIRES_PAYMENT_METHOD',
      'REQUIRES_CONFIRMATION',
      'REQUIRES_ACTION',
      'PROCESSING',
      'REQUIRES_CAPTURE',
      'SUCCEEDED',
      'CANCELED',
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})
export type PaymentIntentCreateParams = z.infer<
  typeof paymentIntentCreateSchema
>
export type PaymentIntentCancelParams = z.infer<
  typeof paymentIntentCancelSchema
>
export type PaymentIntentListQuery = z.infer<
  typeof paymentIntentListQuerySchema
>
