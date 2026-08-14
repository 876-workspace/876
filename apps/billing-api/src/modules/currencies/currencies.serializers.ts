import type { Currency, TenantCurrency } from '@/db'

export function serializeCurrency(
  row: TenantCurrency & { currency: Currency }
) {
  return {
    object: 'currency' as const,
    currencyCode: row.currencyCode,
    isDefault: row.isDefault,
    isEnabled: row.isEnabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    currency: {
      code: row.currency.code,
      name: row.currency.name,
      symbol: row.currency.symbol,
      decimalPlaces: row.currency.decimalPlaces,
      isActive: row.currency.isActive,
    },
  }
}
