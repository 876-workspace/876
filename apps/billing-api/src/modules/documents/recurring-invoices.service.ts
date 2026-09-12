import { unwrap } from './documents.service'
import { documentList } from './documents.serializers'
import { serializeRecurringInvoice } from './recurring-invoices.serializers'
import {
  createRecurringInvoice,
  createRecurringInvoiceFromInvoice,
  deleteRecurringInvoice,
  listRecurringInvoiceChildren,
  listRecurringInvoices,
  retrieveRecurringInvoice,
  transitionRecurringInvoice,
  updateRecurringInvoice,
} from './repositories/recurring-invoices.repository'
import { err } from './repositories/result'
import type {
  RecurringInvoiceCreateParams,
  RecurringInvoiceFromInvoiceParams,
  RecurringInvoiceStatus,
  RecurringInvoiceUpdateParams,
} from './schemas/recurring-invoice'

const KIND = 'recurring_invoice'

async function retrieve(tenantId: string, id: string) {
  const row = await retrieveRecurringInvoice(tenantId, id)
  if (!row)
    return unwrap(
      err(
        'Recurring Invoice not found.',
        404,
        'billing/recurring-invoice-not-found'
      ),
      KIND
    )
  return serializeRecurringInvoice(row)
}

export const recurringInvoicesService = {
  async list(
    tenantId: string,
    status: RecurringInvoiceStatus | undefined,
    customerId: string | undefined,
    url: string
  ) {
    const rows = await listRecurringInvoices(tenantId, status, customerId)
    // Same legacy list envelope as the other Documents resources.
    return {
      object: 'list' as const,
      data: rows.map(serializeRecurringInvoice),
      has_more: false,
      total_count: rows.length,
      url,
    }
  },
  retrieve,
  async create(tenantId: string, body: RecurringInvoiceCreateParams) {
    return serializeRecurringInvoice(
      await unwrap(await createRecurringInvoice(tenantId, body), KIND)
    )
  },
  async createFromInvoice(
    tenantId: string,
    invoiceId: string,
    schedule: RecurringInvoiceFromInvoiceParams,
    sourceAppId?: string
  ) {
    return serializeRecurringInvoice(
      await unwrap(
        await createRecurringInvoiceFromInvoice(
          tenantId,
          invoiceId,
          schedule,
          sourceAppId
        ),
        KIND
      )
    )
  },
  async update(
    tenantId: string,
    id: string,
    body: RecurringInvoiceUpdateParams
  ) {
    return serializeRecurringInvoice(
      await unwrap(await updateRecurringInvoice(tenantId, id, body), KIND)
    )
  },
  async transition(
    tenantId: string,
    id: string,
    action: 'pause' | 'resume' | 'stop'
  ) {
    return serializeRecurringInvoice(
      await unwrap(await transitionRecurringInvoice(tenantId, id, action), KIND)
    )
  },
  async delete(tenantId: string, id: string) {
    const { id: deletedId } = await unwrap(
      await deleteRecurringInvoice(tenantId, id),
      KIND
    )
    return {
      object: 'recurring-invoice' as const,
      id: deletedId,
      deleted: true as const,
    }
  },
  async children(tenantId: string, id: string, url: string) {
    await retrieve(tenantId, id)
    const rows = await listRecurringInvoiceChildren(tenantId, id)
    return documentList('invoice', rows, url)
  },
}
