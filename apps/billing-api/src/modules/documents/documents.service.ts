import { AppHttpError } from '@/http/errors'
import type { IntegrationAttribution } from '@/http/integration/idempotency'
import { creditNotes } from './repositories/credit-notes'
import { estimates } from './repositories/estimates'
import { invoicePreferences } from './repositories/invoice-preferences'
import { invoices } from './repositories/invoices'
import { quotes } from './repositories/quotes'
import type { ServiceResult } from './schemas/api'
import type { CreditNoteApplyParams, CreditNoteCreateParams } from './schemas/credit-note'
import type { EstimateCreateParams, EstimateStatus, EstimateUpdateParams } from './schemas/estimate'
import type { InvoiceFinalizeParams, InvoiceCreateParams, InvoiceStatus, InvoiceUpdateParams, InvoiceVoidParams } from './schemas/invoice'
import type { InvoicePreferenceUpdateParams } from './schemas/invoice-preference'
import type { QuoteCreateParams, QuoteStatus, QuoteUpdateParams } from './schemas/quote'
import { documentList, serializeDocument } from './documents.serializers'

async function unwrap<T>(result: Awaited<ServiceResult<T>>, kind: string): Promise<T> { if (result.error === null) return result.data; const status = result.status ?? 500; throw new AppHttpError({ code: status === 404 ? `${kind}/not-found` : status === 409 ? `${kind}/invalid-state` : status === 422 ? 'validation/invalid-request' : 'internal/error', message: result.error, httpStatus: status }) }
function missing(kind: string) { return new AppHttpError({ code: `${kind}/not-found`, message: `${kind.replace('_', ' ')} not found.`, httpStatus: 404 }) }
async function ownedInvoice(tenantId: string, id: string, sourceAppId?: string) { const row = await invoices.retrieve(tenantId, id, sourceAppId); if (!row) throw missing('invoice'); return row }

export const documentsService = {
  async listInvoices(tenantId: string, status?: InvoiceStatus, sourceAppId?: string, url = '/api/v1/invoices') { return documentList('invoice', await invoices.list(tenantId, status, sourceAppId), url) },
  async getInvoice(tenantId: string, id: string, sourceAppId?: string) { return serializeDocument('invoice', await ownedInvoice(tenantId, id, sourceAppId)) },
  async createInvoice(tenantId: string, body: InvoiceCreateParams, attribution?: IntegrationAttribution | null) { const result = await unwrap(await invoices.create(tenantId, body, attribution ?? undefined), 'invoice'); return { resource: { object: 'invoice', id: result.id }, replayed: result.replayed === true } },
  async updateInvoice(tenantId: string, id: string, body: InvoiceUpdateParams, sourceAppId?: string) { if (sourceAppId) await ownedInvoice(tenantId, id, sourceAppId); return { object: 'invoice', ...(await unwrap(await invoices.update(tenantId, id, body), 'invoice')) } },
  async finalizeInvoice(tenantId: string, id: string, body: InvoiceFinalizeParams, sourceAppId?: string) { if (sourceAppId) await ownedInvoice(tenantId, id, sourceAppId); return { object: 'invoice', ...(await unwrap(await invoices.finalize(tenantId, id, body), 'invoice')) } },
  async voidInvoice(tenantId: string, id: string, body: InvoiceVoidParams, sourceAppId?: string) { if (sourceAppId) await ownedInvoice(tenantId, id, sourceAppId); return { object: 'invoice', ...(await unwrap(await invoices.void(tenantId, id, body), 'invoice')) } },
  async deleteInvoice(tenantId: string, id: string) { return { object: 'invoice', ...(await unwrap(await invoices.delete(tenantId, id), 'invoice')), deleted: true } },
  async listQuotes(tenantId: string, status?: QuoteStatus) { return documentList('quote', await quotes.list(tenantId, status), '/api/v1/quotes') },
  async getQuote(tenantId: string, id: string) { const row = await quotes.retrieve(tenantId, id); if (!row) throw missing('quote'); return serializeDocument('quote', row) },
  async createQuote(tenantId: string, body: QuoteCreateParams) { return { object: 'quote', ...(await unwrap(await quotes.create(tenantId, body), 'quote')) } },
  async updateQuote(tenantId: string, id: string, body: QuoteUpdateParams) { return { object: 'quote', ...(await unwrap(await quotes.update(tenantId, id, body), 'quote')) } },
  async deleteQuote(tenantId: string, id: string) { return { object: 'quote', ...(await unwrap(await quotes.delete(tenantId, id), 'quote')), deleted: true } },
  async listEstimates(tenantId: string, status?: EstimateStatus) { return documentList('estimate', await estimates.list(tenantId, status), '/api/v1/estimates') },
  async getEstimate(tenantId: string, id: string) { const row = await estimates.retrieve(tenantId, id); if (!row) throw missing('estimate'); return serializeDocument('estimate', row) },
  async createEstimate(tenantId: string, body: EstimateCreateParams) { return { object: 'estimate', ...(await unwrap(await estimates.create(tenantId, body), 'estimate')) } },
  async updateEstimate(tenantId: string, id: string, body: EstimateUpdateParams) { return { object: 'estimate', ...(await unwrap(await estimates.update(tenantId, id, body), 'estimate')) } },
  async deleteEstimate(tenantId: string, id: string) { return { object: 'estimate', ...(await unwrap(await estimates.delete(tenantId, id), 'estimate')), deleted: true } },
  async listCreditNotes(tenantId: string, status?: 'DRAFT' | 'OPEN' | 'CLOSED' | 'VOID') { return documentList('credit_note', await creditNotes.list(tenantId, status), '/api/v1/credit-notes') },
  async getCreditNote(tenantId: string, id: string) { const row = await creditNotes.retrieve(tenantId, id); if (!row) throw missing('credit_note'); return serializeDocument('credit_note', row) },
  async createCreditNote(tenantId: string, body: CreditNoteCreateParams) { return { object: 'credit_note', ...(await unwrap(await creditNotes.create(tenantId, body), 'credit_note')) } },
  async applyCreditNote(tenantId: string, id: string, body: CreditNoteApplyParams) { return { object: 'credit_note', ...(await unwrap(await creditNotes.apply(tenantId, id, body), 'credit_note')) } },
  async voidCreditNote(tenantId: string, id: string) { return { object: 'credit_note', ...(await unwrap(await creditNotes.void(tenantId, id), 'credit_note')) } },
  async getPreferences(tenantId: string) { const row = await invoicePreferences.retrieve(tenantId); if (!row) throw missing('invoice_preference'); return serializeDocument('invoice_preference', row) },
  async updatePreferences(tenantId: string, body: InvoicePreferenceUpdateParams) { return { object: 'invoice_preference', ...(await unwrap(await invoicePreferences.update(tenantId, body), 'invoice_preference')) } },
  async assessLateFees(tenantId: string, asOf?: number) { return { object: 'late_fee_run', ...(await unwrap(await invoicePreferences.assessLateFees(tenantId, asOf), 'late_fee')) } },
}
