import { Request } from '../request'
import type { Runtime } from '../runtime'
import { InvoiceCreatedSchema } from '../schemas'
import type {
  InvoiceCreated,
  InvoiceCreateParams,
  InvoiceFinalizeParams,
  InvoiceVoidParams,
  RequestOptions,
} from '../types'

/** `$billing.invoices.*` — tenant-scoped invoice operations. */
export function createInvoicesResource(runtime: Runtime) {
  return {
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
  }
}
