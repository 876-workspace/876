import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/db/client'
import type { ServiceResult } from '../../schemas/api'

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

    const deleted = await prisma.quote.deleteMany({
      where: {
        id: quoteId,
        tenantId,
        status: 'DRAFT',
        OR: [{ expiresAt: null }, { expiresAt: { gt: nowUnixSeconds() } }],
      },
    })
    if (deleted.count !== 1)
      return err(
        'Only valid draft quotes can be deleted.',
        409,
        'billing/quote-invalid-state'
      )

    return ok({ id: quoteId })
  } catch (error) {
    console.error('[billing.service.quotes.delete]', error)
    return err('Failed to delete the quote.', 500)
  }
}
