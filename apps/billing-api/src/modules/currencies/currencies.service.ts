import { AppHttpError } from '@/http/errors'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  enabledCurrencyExists,
  enableCurrencyRow,
  findEnabledCurrencyRow,
  listCurrencyRows,
  removeCurrencyRow,
  setDefaultCurrencyRow,
  updateCurrencyRow,
} from './currencies.repository'
import type {
  CurrencyEnableBody,
  CurrencyMutationBody,
} from './currencies.schemas'
import { serializeCurrency } from './currencies.serializers'

export async function hasEnabledCurrency(
  tenantId: string,
  currencyCode: string
): Promise<boolean> {
  return enabledCurrencyExists(tenantId, currencyCode)
}

export async function enabledCurrencyDecimalPlaces(
  tenantId: string,
  currencyCode: string
): Promise<number | null> {
  const row = await findEnabledCurrencyRow(tenantId, currencyCode)
  return row?.currency.decimalPlaces ?? null
}

export async function listCurrencies(
  tenantId: string,
  url = '/api/v1/currencies'
) {
  const rows = await listCurrencyRows(tenantId)
  return {
    object: 'list' as const,
    data: rows.map(serializeCurrency),
    has_more: false,
    total_count: rows.length,
    url,
  }
}

export async function createCurrency(
  tenantId: string,
  body: CurrencyEnableBody
) {
  const enabled = await enableCurrencyRow(
    tenantId,
    body.currency,
    nowUnixSeconds()
  )
  if (!enabled) {
    throw new AppHttpError({
      code: 'validation/invalid-request',
      message: 'This currency is not supported.',
      httpStatus: 422,
    })
  }
  return { object: 'tenant_currency' as const, id: body.currency }
}

export async function setDefaultCurrency(tenantId: string, currency: string) {
  const changed = await setDefaultCurrencyRow(
    tenantId,
    currency,
    nowUnixSeconds()
  )
  if (!changed) {
    throw new AppHttpError({
      code: 'validation/invalid-request',
      message: 'This currency is not supported.',
      httpStatus: 422,
    })
  }
  return { object: 'tenant_currency' as const, currency }
}

export async function updateCurrency(
  tenantId: string,
  code: string,
  body: Omit<CurrencyMutationBody, 'code'>
) {
  const changed = await updateCurrencyRow({
    tenantId,
    code,
    ...body,
    symbol: body.symbol ?? null,
    now: nowUnixSeconds(),
  })
  if (!changed) throw currencyNotFound()
  return { object: 'tenant_currency' as const, currency: code }
}

export async function removeCurrency(tenantId: string, code: string) {
  const result = await removeCurrencyRow(tenantId, code)
  if (result === 'missing') throw currencyNotFound()
  if (result === 'default') {
    throw new AppHttpError({
      code: 'currency/default-cannot-delete',
      message: 'Cannot delete the default base currency.',
      httpStatus: 400,
    })
  }
  return { object: 'tenant_currency' as const, currency: code }
}

function currencyNotFound(): AppHttpError {
  return new AppHttpError({
    code: 'currency/not-found',
    message: 'Currency not found.',
    httpStatus: 404,
  })
}
