import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { QuoteCreateParams } from '@/types/quote'
import type { ServiceResult } from '@/types/api'

import { buildDocumentLines } from '../documents/lines'
import { nextDocumentNumber } from '../documents/numbers'
import { err, ok } from '../result'
import { hasEnabledCurrency } from '../shared'

/** Creates a draft sales quote with immutable line snapshots. */
export async function create(
  tenantId: string,
  params: QuoteCreateParams
): ServiceResult<{ id: string }> {
  const [customer, tenant, preference] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: params.customerId, tenantId, status: 'ACTIVE' },
      select: { id: true, defaultCurrency: true, priceListId: true },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { defaultCurrency: true },
    }),
    prisma.documentPreference.findUnique({
      where: {
        tenantId_documentType: { tenantId, documentType: 'QUOTE' },
      },
      select: { customerNote: true, termsAndConditions: true },
    }),
  ])
  if (!customer) return err('The selected customer was not found.', 404)
  if (!tenant) return err('The Billing workspace was not found.', 404)

  const currency =
    params.currency ?? customer.defaultCurrency ?? tenant.defaultCurrency
  if (!(await hasEnabledCurrency(tenantId, currency)))
    return err('Enable the quote currency before using it.', 422)

  const priceListId =
    params.priceListId === undefined ? customer.priceListId : params.priceListId
  const prepared = priceListId
    ? await buildDocumentLines(tenantId, currency, params.lines, priceListId)
    : await buildDocumentLines(tenantId, currency, params.lines)
  if (prepared.error !== null) return err(prepared.error, 422)

  const preparedDocument = prepared.data

  const now = nowUnixSeconds()
  const number = await nextDocumentNumber(tenantId, 'QUOTE', now)
  const quote = await prisma.$transaction(async (tx) => {
    return tx.quote.create({
      data: {
        id: generateId('Quote'),
        tenantId,
        customerId: customer.id,
        ...(preparedDocument.priceList
          ? {
              priceListId: preparedDocument.priceList.id,
              priceListName: preparedDocument.priceList.name,
            }
          : {}),
        number,
        status: 'DRAFT',
        currency,
        issueAt: params.issueAt ?? now,
        expiresAt: params.expiresAt ?? null,
        subtotalAmount: preparedDocument.subtotalAmount,
        taxAmount: preparedDocument.taxAmount,
        totalAmount: preparedDocument.totalAmount,
        notes:
          params.notes === undefined
            ? (preference?.customerNote ?? null)
            : params.notes,
        terms:
          params.terms === undefined
            ? (preference?.termsAndConditions ?? null)
            : params.terms,
        createdAt: now,
        updatedAt: now,
        lines: {
          create: preparedDocument.lines.map((line) => ({
            id: generateId('QuoteLine'),
            ...line,
            createdAt: now,
            updatedAt: now,
          })),
        },
      },
    })
  })

  return ok({ id: quote.id })
}
