import { prisma } from '@/db/client'

/**
 * Existing quote/invoice snapshots do not carry a Variant selection. Converting
 * such an Item would make those documents ambiguous on later conversion,
 * finalization, or void, so the first variant release requires a fresh Item.
 */
export async function hasVariantConversionBlockers(
  tenantId: string,
  itemId: string
) {
  const [quoteLines, invoiceLines] = await Promise.all([
    prisma.quoteLine.count({
      where: { itemId, quote: { tenantId } },
    }),
    prisma.invoiceLine.count({
      where: { itemId, invoice: { tenantId } },
    }),
  ])

  return quoteLines > 0 || invoiceLines > 0
}
