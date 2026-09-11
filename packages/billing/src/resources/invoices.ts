import { InvoiceDetailSchema } from '../types/invoice.schema'
import type { InvoiceDetail } from '../types/invoice'

import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  DeletedInvoiceSchema,
  InvoiceCreatedSchema,
  InvoiceListSchema,
  InvoiceSchema,
} from '../schemas'
import type {
  Invoice,
  InvoiceCreated,
  InvoiceCreateParams,
  InvoiceFinalizeParams,
  InvoiceList,
  InvoiceListParams,
  InvoiceVoidParams,
  InvoiceWriteOffParams,
  InvoiceUpdateParams,
  DeletedInvoice,
  RequestOptions,
} from '../types'

/** `$876.billing.invoices.*` — tenant-scoped invoice operations. */
export function createInvoicesResource(runtime: Runtime) {
  return {
    /** Lists invoices in the active Billing workspace. */
    list(params: InvoiceListParams = {}, options?: RequestOptions) {
      return Request<InvoiceList>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/invoices',
          query: params as Record<
            string,
            string | number | boolean | undefined
          >,
          signal: options?.signal,
        },
        InvoiceListSchema
      )
    },
    /** Creates a draft invoice in the active Billing workspace. */
    create(params: InvoiceCreateParams, options?: RequestOptions) {
      return Request<InvoiceCreated>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/invoices',
          body: params,
          signal: options?.signal,
        },
        InvoiceCreatedSchema
      )
    },
    /** Retrieves a single invoice by ID. */
    retrieve(invoiceId: string, options?: RequestOptions) {
      return Request<InvoiceDetail>(
        runtime,
        {
          method: 'GET',
          path: `/api/v1/invoices/${encodeURIComponent(invoiceId)}`,
          signal: options?.signal,
        },
        InvoiceDetailSchema
      )
    },
    /** Updates a draft invoice. */
    update(
      invoiceId: string,
      params: InvoiceUpdateParams,
      options?: RequestOptions
    ) {
      return Request<Invoice>(
        runtime,
        {
          method: 'PATCH',
          path: `/api/v1/invoices/${encodeURIComponent(invoiceId)}`,
          body: params,
          signal: options?.signal,
        },
        InvoiceSchema
      )
    },
    /** Deletes a draft invoice. */
    delete(invoiceId: string, options?: RequestOptions) {
      return Request<DeletedInvoice>(
        runtime,
        {
          method: 'DELETE',
          path: `/api/v1/invoices/${encodeURIComponent(invoiceId)}`,
          signal: options?.signal,
        },
        DeletedInvoiceSchema
      )
    },
    /** Finalizes a draft invoice and posts its receivable. */
    finalize(
      invoiceId: string,
      params: InvoiceFinalizeParams = {},
      options?: RequestOptions
    ) {
      return Request<InvoiceCreated>(
        runtime,
        {
          method: 'POST',
          path: `/api/v1/invoices/${encodeURIComponent(invoiceId)}/finalize`,
          body: params,
          signal: options?.signal,
        },
        InvoiceCreatedSchema
      )
    },
    /** Records that a finalized invoice was sent without replacing its financial state. */
    send(invoiceId: string, options?: RequestOptions) {
      return Request<InvoiceCreated>(
        runtime,
        {
          method: 'POST',
          path: `/api/v1/invoices/${encodeURIComponent(invoiceId)}/send`,
          body: {},
          signal: options?.signal,
        },
        InvoiceCreatedSchema
      )
    },
    /** Voids an unsettled finalized invoice. */
    void(
      invoiceId: string,
      params: InvoiceVoidParams = {},
      options?: RequestOptions
    ) {
      return Request<InvoiceCreated>(
        runtime,
        {
          method: 'POST',
          path: `/api/v1/invoices/${encodeURIComponent(invoiceId)}/void`,
          body: params,
          signal: options?.signal,
        },
        InvoiceCreatedSchema
      )
    },
    /** Writes off the invoice's full remaining receivable. */
    writeOff(
      invoiceId: string,
      params: InvoiceWriteOffParams,
      options?: RequestOptions
    ) {
      return Request<InvoiceCreated>(
        runtime,
        {
          method: 'POST',
          path: `/api/v1/invoices/${encodeURIComponent(invoiceId)}/write-off`,
          body: params,
          signal: options?.signal,
        },
        InvoiceCreatedSchema
      )
    },
  }
}
