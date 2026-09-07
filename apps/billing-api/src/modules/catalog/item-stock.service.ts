import { AppHttpError, appError } from '@/http/errors'
import type { ServiceResult } from './schemas/api'
import type { ItemStockAdjustmentParams } from './schemas/item'
import { serializeCatalog } from './catalog.serializers'
import { items } from './repositories/items'
import { stock } from './repositories/items/stock'

type StockTransaction = Parameters<typeof stock.applyInvoice>[0]
type StockLines = Parameters<typeof stock.validateAvailability>[1]

async function unwrapStock<T>(result: Awaited<ServiceResult<T>>): Promise<T> {
  if (result.error === null) return result.data
  if (result.code)
    throw appError(result.code, {
      message: result.error,
      httpStatus: result.status,
    })

  throw new AppHttpError({
    code:
      result.status === 404
        ? 'item/not-found'
        : result.status === 409
          ? 'item/conflict'
          : result.status === 422
            ? 'validation/invalid-request'
            : 'internal/error',
    message: result.error,
    httpStatus: result.status ?? 500,
  })
}

export async function adjustItemStock(
  tenantId: string,
  itemId: string,
  body: ItemStockAdjustmentParams,
  createdBy?: string,
  sourceAppId?: string
) {
  if (sourceAppId) {
    const owned = await items.retrieve(tenantId, itemId, sourceAppId)
    if (!owned)
      throw new AppHttpError({
        code: 'item/not-found',
        message: 'item not found.',
        httpStatus: 404,
      })
  }

  await unwrapStock(await items.adjustStock(tenantId, itemId, body, createdBy))

  const item = await items.retrieve(tenantId, itemId, sourceAppId)
  if (!item)
    throw new AppHttpError({
      code: 'item/not-found',
      message: 'item not found.',
      httpStatus: 404,
    })

  return serializeCatalog('item', item)
}

export function validateInvoiceStock(tenantId: string, lines: StockLines) {
  return stock.validateAvailability(tenantId, lines)
}

export function applyInvoiceStock(
  tx: StockTransaction,
  tenantId: string,
  invoiceId: string,
  lines: StockLines,
  now: number
) {
  return stock.applyInvoice(tx, tenantId, invoiceId, lines, now)
}

export function restoreInvoiceStock(
  tx: StockTransaction,
  tenantId: string,
  invoiceId: string,
  now: number
) {
  return stock.restoreInvoice(tx, tenantId, invoiceId, now)
}
