import type { AccountingProvider, AccountingProviderConnection } from '@/db'
import { accountingProvider } from '@/providers/accounting'

export function serializeAccountingProvider(row: AccountingProvider) {
  return {
    object: 'accounting-provider' as const,
    id: row.id,
    key: row.key,
    name: row.name,
    adapter: row.adapter,
    capabilities: accountingProvider(row.key).capabilities,
    isActive: row.isActive,
  }
}

export function serializeAccountingConnection(
  row: AccountingProviderConnection & { provider: AccountingProvider }
) {
  return {
    object: 'accounting-provider-connection' as const,
    id: row.id,
    providerId: row.providerId,
    providerKey: row.provider.key,
    name: row.name,
    environment: row.environment as 'sandbox' | 'live',
    status: row.status as 'pending' | 'active' | 'disabled' | 'error',
    mode: row.mode as 'native' | 'mirror' | 'provider-backed',
    providerOrganizationId: row.providerOrganizationId,
    apiDomain: row.apiDomain,
    scopes: row.scopes,
    lastSyncedAt: row.lastSyncedAt,
    lastSuccessfulSyncAt: row.lastSuccessfulSyncAt,
    lastErrorCode: row.lastErrorCode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
