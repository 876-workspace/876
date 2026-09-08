import { nowUnixSeconds } from '@876/core/timestamps'

import { getSettings } from '@/config'
import { AppHttpError, appError } from '@/http/errors'
import type { IntegrationAttribution } from '@/http/integration/idempotency'
import { getLogger } from '@/platform/logger'
import type { IdempotencyContext } from '@/types/commerce'

import { documentList, serializeDocument } from './documents.serializers'
import {
  isQuoteExpired,
  type QuoteLifecycleAction,
} from './quote-lifecycle'
import { creditNotes } from './repositories/credit-notes'
import { invoicePreferences } from './repositories/invoice-preferences'
import { invoices } from './repositories/invoices'
import { quotes } from './repositories/quotes'
import { quotePreferences } from './repositories/quotes/preferences'
import type { ServiceResult } from './schemas/api'
import type {
  CreditNoteApplyParams,
  CreditNoteCreateParams,
} from './schemas/credit-note'
import type {
  InvoiceCreateParams,
  InvoiceFinalizeParams,
  InvoiceStatus,
  InvoiceUpdateParams,
  InvoiceVoidParams,
  InvoiceWriteOffParams,
} from './schemas/invoice'
import type { InvoicePreferenceUpdateParams } from './schemas/invoice-preference'
import type {
  QuoteCreateParams,
  QuoteStatus,
  QuoteUpdateParams,
} from './schemas/quote'
import type { QuotePreferenceUpdateParams } from './schemas/quote-preference'
import {
  finalizeInvoiceWorkflow,
  sendInvoiceWorkflow,
  transitionQuoteWorkflow,
  voidInvoiceWorkflow,
  writeOffInvoiceWorkflow,
} from './workflows'

const log = getLogger('documents')

async function unwrap<T>(
  result: Awaited<ServiceResult<T>>,
  kind: string
): Promise<T> {
  if (result.error === null) return result.data
  const status = result.status ?? 500
  if (result.code)
    throw appError(result.code, { message: result.error, httpStatus: status })
  if (status === 409 && kind === 'quote')
    throw appError('billing/quote-invalid-state')
  throw new AppHttpError({
    code:
      status === 404
        ? `${kind}/not-found`
        : status === 409
          ? `${kind}/invalid-state`
          : status === 422
            ? 'validation/invalid-request'
            : 'internal/error',
    message: result.error,
    httpStatus: status,
  })
}

function missing(kind: string) {
  return new AppHttpError({
    code: `${kind}/not-found`,
    message: `${kind.replace('_', ' ')} not found.`,
    httpStatus: 404,
  })
}

async function ownedInvoice(
  tenantId: string,
  id: string,
  sourceAppId?: string
) {
  const row = await invoices.retrieve(tenantId, id, sourceAppId)
  if (!row) throw missing('invoice')
  return row
}

async function assertQuoteConvertible(tenantId: string, quoteId: string) {
  const quote = await quotes.retrieve(tenantId, quoteId)
  if (!quote) throw missing('quote')
  if (quote.status !== 'ACCEPTED') {
    throw new AppHttpError({
      code: 'invoice/invalid-state',
      message: 'Accept the quote before converting it to an invoice.',
      httpStatus: 409,
    })
  }
  if (
    isQuoteExpired(
      { expiresAt: quote.expiresAt ?? null },
      nowUnixSeconds()
    )
  ) {
    throw new AppHttpError({
      code: 'invoice/invalid-state',
      message: 'An expired quote cannot be converted to an invoice.',
      httpStatus: 409,
    })
  }
  return quote
}

async function convertAcceptedQuote(tenantId: string, quoteId: string) {
  const quote = await assertQuoteConvertible(tenantId, quoteId)
  if (quote.convertedInvoice?.id)
    return {
      object: 'invoice' as const,
      id: quote.convertedInvoice.id,
      replayed: true as const,
    }

  const result = await invoices.create(tenantId, { quoteId })
  if (result.error !== null) {
    // A concurrent conversion can win the one-to-one relation after our first
    // read. Re-read before surfacing a conflict so the command remains
    // naturally idempotent even without a caller-supplied key.
    if (result.status === 409) {
      const current = await quotes.retrieve(tenantId, quoteId)
      if (current?.convertedInvoice?.id)
        return {
          object: 'invoice' as const,
          id: current.convertedInvoice.id,
          replayed: true as const,
        }
    }
    await unwrap(result, 'invoice')
    throw new Error('Unreachable quote conversion result.')
  }

  return {
    object: 'invoice' as const,
    id: result.data.id,
    replayed: result.data.replayed === true,
  }
}

export const documentsService = {
  async listInvoices(
    tenantId: string,
    status?: InvoiceStatus,
    sourceAppId?: string,
    url = '/api/v1/invoices'
  ) {
    return documentList(
      'invoice',
      await invoices.list(tenantId, status, sourceAppId),
      url
    )
  },

  async getInvoice(tenantId: string, id: string, sourceAppId?: string) {
    return serializeDocument(
      'invoice',
      await ownedInvoice(tenantId, id, sourceAppId)
    )
  },

  async createInvoice(
    tenantId: string,
    body: InvoiceCreateParams,
    attribution?: IntegrationAttribution | null
  ) {
    if (body.quoteId) await assertQuoteConvertible(tenantId, body.quoteId)
    const result = await unwrap(
      await invoices.create(tenantId, body, attribution ?? undefined),
      'invoice'
    )
    return {
      resource: { object: 'invoice', id: result.id },
      replayed: result.replayed === true,
    }
  },

  async updateInvoice(
    tenantId: string,
    id: string,
    body: InvoiceUpdateParams,
    sourceAppId?: string
  ) {
    if (sourceAppId) await ownedInvoice(tenantId, id, sourceAppId)
    return {
      object: 'invoice',
      ...(await unwrap(await invoices.update(tenantId, id, body), 'invoice')),
    }
  },

  async finalizeInvoice(
    tenantId: string,
    id: string,
    body: InvoiceFinalizeParams,
    sourceAppId?: string,
    idempotency?: IdempotencyContext
  ) {
    if (sourceAppId) await ownedInvoice(tenantId, id, sourceAppId)
    return {
      object: 'invoice',
      ...(await unwrap(
        await finalizeInvoiceWorkflow(tenantId, id, body, idempotency),
        'invoice'
      )),
    }
  },

  async sendInvoice(
    tenantId: string,
    id: string,
    sourceAppId?: string,
    idempotency?: IdempotencyContext
  ) {
    if (sourceAppId) await ownedInvoice(tenantId, id, sourceAppId)
    return {
      object: 'invoice',
      ...(await unwrap(
        await sendInvoiceWorkflow(tenantId, id, idempotency),
        'invoice'
      )),
    }
  },

  async voidInvoice(
    tenantId: string,
    id: string,
    body: InvoiceVoidParams,
    sourceAppId?: string,
    idempotency?: IdempotencyContext
  ) {
    if (sourceAppId) await ownedInvoice(tenantId, id, sourceAppId)
    return {
      object: 'invoice',
      ...(await unwrap(
        await voidInvoiceWorkflow(tenantId, id, body, idempotency),
        'invoice'
      )),
    }
  },

  async writeOffInvoice(
    tenantId: string,
    id: string,
    body: InvoiceWriteOffParams,
    sourceAppId?: string,
    idempotency?: IdempotencyContext
  ) {
    if (sourceAppId) await ownedInvoice(tenantId, id, sourceAppId)
    return {
      object: 'invoice',
      ...(await unwrap(
        await writeOffInvoiceWorkflow(tenantId, id, body, idempotency),
        'invoice'
      )),
    }
  },

  async deleteInvoice(tenantId: string, id: string) {
    return {
      object: 'invoice',
      ...(await unwrap(await invoices.delete(tenantId, id), 'invoice')),
      deleted: true,
    }
  },

  async listQuotes(tenantId: string, status?: QuoteStatus) {
    return documentList(
      'quote',
      await quotes.list(tenantId, status),
      '/api/v1/quotes'
    )
  },

  async getQuote(tenantId: string, id: string) {
    const row = await quotes.retrieve(tenantId, id)
    if (!row) throw missing('quote')
    return serializeDocument('quote', row)
  },

  async createQuote(tenantId: string, body: QuoteCreateParams) {
    return {
      object: 'quote',
      ...(await unwrap(await quotes.create(tenantId, body), 'quote')),
    }
  },

  async updateQuote(tenantId: string, id: string, body: QuoteUpdateParams) {
    return {
      object: 'quote',
      ...(await unwrap(await quotes.update(tenantId, id, body), 'quote')),
    }
  },

  async deleteQuote(tenantId: string, id: string) {
    return {
      object: 'quote',
      ...(await unwrap(await quotes.delete(tenantId, id), 'quote')),
      deleted: true,
    }
  },

  async transitionQuote(
    tenantId: string,
    id: string,
    action: QuoteLifecycleAction,
    idempotency?: IdempotencyContext
  ) {
    const resource = {
      object: 'quote' as const,
      ...(await unwrap(
        await transitionQuoteWorkflow(tenantId, id, action, idempotency),
        'quote'
      )),
    }

    if (action === 'accept') {
      const preference = await quotePreferences.retrieve(tenantId)
      if (preference.acceptedQuoteConversion === 'draft-invoice-on-accept')
        await convertAcceptedQuote(tenantId, id)
    }

    return resource
  },

  async convertQuoteToInvoice(tenantId: string, id: string) {
    return convertAcceptedQuote(tenantId, id)
  },

  getQuotePreferences(tenantId: string) {
    return quotePreferences.retrieve(tenantId)
  },

  updateQuotePreferences(
    tenantId: string,
    body: QuotePreferenceUpdateParams
  ) {
    return quotePreferences.update(tenantId, body.acceptedQuoteConversion)
  },

  async listCreditNotes(
    tenantId: string,
    status?: 'DRAFT' | 'OPEN' | 'CLOSED' | 'VOID'
  ) {
    return documentList(
      'credit_note',
      await creditNotes.list(tenantId, status),
      '/api/v1/credit-notes'
    )
  },

  async getCreditNote(tenantId: string, id: string) {
    const row = await creditNotes.retrieve(tenantId, id)
    if (!row) throw missing('credit_note')
    return serializeDocument('credit_note', row)
  },

  async createCreditNote(tenantId: string, body: CreditNoteCreateParams) {
    return {
      object: 'credit_note',
      ...(await unwrap(
        await creditNotes.create(tenantId, body),
        'credit_note'
      )),
    }
  },

  async applyCreditNote(
    tenantId: string,
    id: string,
    body: CreditNoteApplyParams
  ) {
    return {
      object: 'credit_note',
      ...(await unwrap(
        await creditNotes.apply(tenantId, id, body),
        'credit_note'
      )),
    }
  },

  async voidCreditNote(tenantId: string, id: string) {
    return {
      object: 'credit_note',
      ...(await unwrap(await creditNotes.void(tenantId, id), 'credit_note')),
    }
  },

  async getPreferences(tenantId: string) {
    const row = await invoicePreferences.retrieve(tenantId)
    if (!row) throw missing('invoice_preference')
    return serializeDocument('invoice_preference', row)
  },

  async updatePreferences(
    tenantId: string,
    body: InvoicePreferenceUpdateParams
  ) {
    return {
      object: 'invoice_preference',
      ...(await unwrap(
        await invoicePreferences.update(tenantId, body),
        'invoice_preference'
      )),
    }
  },

  async assessLateFees(tenantId: string, asOf?: number) {
    if (!getSettings().features.lateFees) {
      log.info(
        { tenantId },
        'BILLING_LATE_FEES_ENABLED is disabled; skipping late-fee assessment.'
      )
      return {
        object: 'late_fee_run' as const,
        created: 0,
        skipped: 0,
        hasMore: false,
      }
    }

    return {
      object: 'late_fee_run',
      ...(await unwrap(
        await invoicePreferences.assessLateFees(tenantId, asOf),
        'late_fee'
      )),
    }
  },
}
