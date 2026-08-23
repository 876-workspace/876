import type { JsonValue, List } from './common'

export type PaymentMethodType = 'CARD' | 'BANK_ACCOUNT' | 'WALLET' | 'MANUAL'
export type PaymentMethodStatus =
  'PENDING' | 'ACTIVE' | 'REQUIRES_ACTION' | 'EXPIRED' | 'DETACHED' | 'FAILED'

export interface PaymentMethodCreateParams {
  customerId: string
  type: PaymentMethodType
  allowRedisplay?: 'ALWAYS' | 'LIMITED' | 'UNSPECIFIED'
  reusable?: boolean
  billingDetails?: Record<string, JsonValue>
  card?: Record<string, JsonValue>
  bankAccount?: Record<string, JsonValue>
  wallet?: Record<string, JsonValue>
  manual?: Record<string, JsonValue>
  metadata?: Record<string, JsonValue>
  credential?:
    | {
        storage: 'provider_token'
        provider: string
        providerConnectionId: string
        providerToken: string
      }
    | { storage: 'vault'; value: string }
    | { storage: 'none' }
}

export interface PaymentMethodUpdateParams {
  billingDetails?: Record<string, JsonValue>
  metadata?: Record<string, JsonValue>
  allowRedisplay?: 'ALWAYS' | 'LIMITED' | 'UNSPECIFIED'
}

export interface PaymentMethodListParams {
  customerId?: string
  type?: PaymentMethodType
  status?: PaymentMethodStatus
  limit?: number
  startingAfter?: string
}

/** Non-secret reusable payment-instrument metadata. Credentials are never returned. */
export interface PaymentMethod {
  object: 'payment_method'
  id: string
  tenantId: string
  customerId: string
  type: PaymentMethodType
  status: PaymentMethodStatus
  allowRedisplay: 'ALWAYS' | 'LIMITED' | 'UNSPECIFIED'
  reusable: boolean
  isDefault: boolean
  billingDetails: unknown | null
  card: unknown | null
  bankAccount: unknown | null
  wallet: unknown | null
  manual: unknown | null
  fingerprint: string | null
  displayLabel: string | null
  expMonth: number | null
  expYear: number | null
  provider: string | null
  providerPaymentMethodId: string | null
  providerConnectionId: string | null
  detachedAt: number | null
  metadata: unknown | null
  createdAt: number
  updatedAt: number
}

export interface DeletedPaymentMethod {
  object: 'payment_method'
  id: string
  deleted: true
}

export type PaymentMethodList = List<PaymentMethod>
