import { AccountingProviderError } from './errors'
import type { AccountingProviderAdapter, AccountingProviderKey } from './types'
import { zohoBooksAdapter } from './zoho-books/adapter'

const registry: Record<AccountingProviderKey, AccountingProviderAdapter> = {
  'zoho-books': zohoBooksAdapter,
}

export function accountingProvider(key: string): AccountingProviderAdapter {
  const provider = registry[key as AccountingProviderKey]
  if (!provider)
    throw new AccountingProviderError({
      code: 'billing/accounting-provider-unsupported',
      retryable: false,
    })
  return provider
}
