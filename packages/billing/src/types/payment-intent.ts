import type { JsonValue, List, MinorAmount } from './common'

export type PaymentIntentStatus =
  | 'REQUIRES_PAYMENT_METHOD'
  | 'REQUIRES_CONFIRMATION'
  | 'REQUIRES_ACTION'
  | 'PROCESSING'
  | 'REQUIRES_CAPTURE'
  | 'SUCCEEDED'
  | 'CANCELED'

export interface PaymentIntentCreateParams {
  customerId: string
  amount: MinorAmount
  currency: string
  paymentMethodId?: string
  invoiceId?: string
  subscriptionId?: string
  captureMethod?: 'AUTOMATIC' | 'MANUAL'
  confirmationMethod?: 'AUTOMATIC' | 'MANUAL'
  paymentMethodTypes?: string[]
  description?: string
  receiptEmail?: string
  metadata?: Record<string, JsonValue>
}

export interface PaymentIntentCancelParams {
  cancellationReason?: string
}

export interface PaymentIntentListParams {
  customerId?: string
  status?: PaymentIntentStatus
  limit?: number
}

export interface PaymentIntent {
  object: 'payment_intent'
  id: string
  tenantId: string
  customerId: string
  invoiceId: string | null
  subscriptionId: string | null
  amount: string
  amountCapturable: string
  amountReceived: string
  currency: string
  status: PaymentIntentStatus
  captureMethod: 'AUTOMATIC' | 'MANUAL'
  confirmationMethod: 'AUTOMATIC' | 'MANUAL'
  paymentMethodId: string | null
  mandateId: string | null
  paymentMethodTypes: string[]
  setupFutureUsage: string
  description: string | null
  receiptEmail: string | null
  statementDescriptor: string | null
  statementDescriptorSuffix: string | null
  lastPaymentError: unknown | null
  nextAction: unknown | null
  processing: unknown | null
  attemptCount: number
  latestPaymentId: string | null
  latestAttemptId: string | null
  canceledAt: number | null
  cancellationReason: string | null
  provider: string | null
  providerConnectionId: string | null
  providerIntentId: string | null
  idempotencyKey: string | null
  metadata: unknown | null
  createdAt: number
  updatedAt: number
}

export type PaymentIntentList = List<PaymentIntent>
