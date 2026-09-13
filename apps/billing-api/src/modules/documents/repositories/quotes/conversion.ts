import type { Prisma } from '@/db'

type QuoteConversionTarget = 'invoice' | 'sales-receipt' | 'sales-order'

type LockedQuote = {
  id: string
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'CANCELED' | 'EXPIRED'
  convertedInvoice: { id: string } | null
  convertedSalesReceipt: { id: string } | null
  convertedSalesOrder: { id: string } | null
}

export type QuoteConversionLockResult =
  | { kind: 'not_found' }
  | { kind: 'available'; quote: LockedQuote }
  | { kind: 'replayed'; resourceId: string }
  | { kind: 'conflict'; message: string }

/**
 * Serializes all document conversions for one quote. The relation check must
 * follow the row lock so only one conversion target can win.
 */
export async function lockQuoteConversion(
  tx: Prisma.TransactionClient,
  tenantId: string,
  quoteId: string,
  target: QuoteConversionTarget
): Promise<QuoteConversionLockResult> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM billing_quotes
    WHERE tenant_id = ${tenantId} AND id = ${quoteId}
    FOR UPDATE
  `
  if (!rows[0]) return { kind: 'not_found' }

  const quote = await tx.quote.findFirst({
    where: { id: quoteId, tenantId },
    select: {
      id: true,
      status: true,
      convertedInvoice: { select: { id: true } },
      convertedSalesReceipt: { select: { id: true } },
      convertedSalesOrder: { select: { id: true } },
    },
  })
  if (!quote) return { kind: 'not_found' }

  if (quote.convertedInvoice) {
    if (target === 'invoice')
      return { kind: 'replayed', resourceId: quote.convertedInvoice.id }
    return {
      kind: 'conflict',
      message: 'This quote has already been converted to an invoice.',
    }
  }
  if (quote.convertedSalesReceipt) {
    if (target === 'sales-receipt')
      return { kind: 'replayed', resourceId: quote.convertedSalesReceipt.id }
    return {
      kind: 'conflict',
      message: 'This quote has already been converted to a Sales Receipt.',
    }
  }
  if (quote.convertedSalesOrder) {
    if (target === 'sales-order')
      return { kind: 'replayed', resourceId: quote.convertedSalesOrder.id }
    return {
      kind: 'conflict',
      message: 'This quote has already been converted to a Sales Order.',
    }
  }

  return { kind: 'available', quote }
}
