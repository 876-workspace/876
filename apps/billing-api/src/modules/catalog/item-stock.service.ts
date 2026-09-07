import { stock } from './repositories/items/stock'

type StockTransaction = Parameters<typeof stock.applyInvoice>[0]
type StockLines = Parameters<typeof stock.validateAvailability>[1]

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
