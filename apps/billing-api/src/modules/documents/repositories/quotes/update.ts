import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/db/client'
import type { QuoteUpdateParams } from '../../schemas/quote'
import type { ServiceResult } from '../../schemas/api'

import { err, ok } from '../result'

/** Updates a draft quote's header details. */
export async function update(
  tenantId: string,
  quoteId: string,
  params: QuoteUpdateParams
): ServiceResult<{ id: string }> {
  if (Object.keys(params).length === 0) return err('Nothing to update.', 422)

  try {
    const current = await prisma.quote.findFirst({
      where: { id: quoteId, tenantId },
      select: { id: true, status: true },
    })

    if (!current) return err('Quote not found.', 404)
    if (current.status !== 'DRAFT')
      return err('Only draft quotes can be edited.', 409)

    const data: Record<string, unknown> = {
      updatedAt: nowUnixSeconds(),
    }

    if (params.issueAt !== undefined) data.issueAt = params.issueAt
    if (params.expiresAt !== undefined) data.expiresAt = params.expiresAt
    if (params.notes !== undefined) data.notes = params.notes
    if (params.terms !== undefined) data.terms = params.terms

    const updated = await prisma.quote.updateMany({
      where: {
        id: quoteId,
        tenantId,
        status: 'DRAFT',
        OR: [{ expiresAt: null }, { expiresAt: { gt: nowUnixSeconds() } }],
      },
      data,
    })
    if (updated.count !== 1)
      return err(
        'Only valid draft quotes can be edited.',
        409,
        'billing/quote-invalid-state'
      )

    return ok({ id: quoteId })
  } catch (error) {
    console.error('[billing.service.quotes.update]', error)
    return err('Failed to update the quote.', 500)
  }
}
