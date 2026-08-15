import type { PaymentProvider, PaymentProviderConnection } from '@/db'

export function serializePaymentProvider(row: PaymentProvider) {
  return {
    object: 'payment_provider' as const,
    id: row.id,
    key: row.key,
    name: row.name,
    logoUrl: row.logoUrl,
    adapter: row.adapter,
    isActive: row.isActive,
  }
}

export function serializeProviderConnection(row: PaymentProviderConnection) {
  return {
    object: 'payment_provider_connection' as const,
    id: row.id,
    providerId: row.providerId,
    name: row.name,
    environment: row.environment,
    status: row.status,
    merchantAccountId: row.merchantAccountId,
    lastSyncedAt: row.lastSyncedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
