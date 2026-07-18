import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  InvoicePreferenceSchema,
  InvoicePreferenceUpdatedSchema,
  LateFeeRunSchema,
} from '../schemas'
import type {
  InvoicePreference,
  InvoicePreferenceUpdated,
  InvoicePreferenceUpdateParams,
  LateFeeRun,
  RequestOptions,
} from '../types'

/** `$billing.invoicePreferences.*` — tenant invoice policy operations. */
export function createInvoicePreferencesResource(runtime: Runtime) {
  return {
    /** Retrieves the workspace invoice and late-fee policy. */
    retrieve(options?: RequestOptions) {
      return Request<InvoicePreference>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/invoice-preferences',
          signal: options?.signal,
        },
        InvoicePreferenceSchema
      )
    },
    /** Replaces the workspace invoice and late-fee policy. */
    update(params: InvoicePreferenceUpdateParams, options?: RequestOptions) {
      return Request<InvoicePreferenceUpdated>(
        runtime,
        {
          method: 'PATCH',
          path: '/api/v1/invoice-preferences',
          body: params,
          signal: options?.signal,
        },
        InvoicePreferenceUpdatedSchema
      )
    },
    /** Assesses eligible overdue invoices once using the current policy. */
    assessLateFees(options?: RequestOptions) {
      return Request<LateFeeRun>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/invoice-preferences/assess-late-fees',
          signal: options?.signal,
        },
        LateFeeRunSchema
      )
    },
  }
}
