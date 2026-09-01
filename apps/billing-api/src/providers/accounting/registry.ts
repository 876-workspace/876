import { AppHttpError } from '@/http/errors'

import type { AccountingProviderAdapter, AccountingProviderKey } from './types'
import { zohoBooksAdapter } from './zoho-books/adapter'

const registry: Record<AccountingProviderKey, AccountingProviderAdapter> = {
  'zoho-books': zohoBooksAdapter,
}

export function accountingProvider(key: string): AccountingProviderAdapter {
  const provider = registry[key as AccountingProviderKey]
  if (!provider)
    throw new AppHttpError({
      code: 'billing/accounting-provider-unsupported',
      message: 'This accounting provider is not supported.',
      httpStatus: 422,
    })
  return provider
}
