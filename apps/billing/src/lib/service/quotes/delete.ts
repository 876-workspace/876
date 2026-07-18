import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Deletes a draft quote. */
export async function deleteQuote(
  tenantId: string,
  quoteId: string
): ServiceResult<{ id: string }> {
  try {
    const current = await prisma.quote.findFirst({
      where: { id: quoteId, tenantId },
      select: { id: true, status: true },
    })

    if (!current) return err('Quote not found.', 404)
    if (current.status !== 'DRAFT')
      return err('Only draft quotes can be deleted.', 409)

    await prisma.quote.delete({
      where: { id: quoteId },
    })

    return ok({ id: quoteId })
  } catch (error) {
    console.error('[billing.service.quotes.delete]', error)
    return err('Failed to delete the quote.', 500)
  }
}
