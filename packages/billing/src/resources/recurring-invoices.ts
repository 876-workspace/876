import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  DeletedRecurringInvoiceSchema,
  InvoiceListSchema,
  RecurringInvoiceListSchema,
  RecurringInvoiceSchema,
} from '../schemas'
import type {
  DeletedRecurringInvoice,
  InvoiceList,
  RecurringInvoice,
  RecurringInvoiceCreateParams,
  RecurringInvoiceList,
  RecurringInvoiceListParams,
  RecurringInvoiceUpdateParams,
  RequestOptions,
} from '../types'

export function createRecurringInvoicesResource(runtime: Runtime) {
  const path = (id: string) =>
    `/api/v1/recurring-invoices/${encodeURIComponent(id)}`
  return {
    list(params: RecurringInvoiceListParams = {}, options?: RequestOptions) {
      return Request<RecurringInvoiceList>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/recurring-invoices',
          query: { status: params.status, customerId: params.customerId },
          signal: options?.signal,
        },
        RecurringInvoiceListSchema
      )
    },
    create(params: RecurringInvoiceCreateParams, options?: RequestOptions) {
      return Request<RecurringInvoice>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/recurring-invoices',
          body: params,
          signal: options?.signal,
        },
        RecurringInvoiceSchema
      )
    },
    retrieve(id: string, options?: RequestOptions) {
      return Request<RecurringInvoice>(
        runtime,
        { method: 'GET', path: path(id), signal: options?.signal },
        RecurringInvoiceSchema
      )
    },
    update(
      id: string,
      params: RecurringInvoiceUpdateParams,
      options?: RequestOptions
    ) {
      return Request<RecurringInvoice>(
        runtime,
        {
          method: 'PATCH',
          path: path(id),
          body: params,
          signal: options?.signal,
        },
        RecurringInvoiceSchema
      )
    },
    pause(id: string, options?: RequestOptions) {
      return Request<RecurringInvoice>(
        runtime,
        {
          method: 'POST',
          path: `${path(id)}/pause`,
          body: {},
          signal: options?.signal,
        },
        RecurringInvoiceSchema
      )
    },
    resume(id: string, options?: RequestOptions) {
      return Request<RecurringInvoice>(
        runtime,
        {
          method: 'POST',
          path: `${path(id)}/resume`,
          body: {},
          signal: options?.signal,
        },
        RecurringInvoiceSchema
      )
    },
    stop(id: string, options?: RequestOptions) {
      return Request<RecurringInvoice>(
        runtime,
        {
          method: 'POST',
          path: `${path(id)}/stop`,
          body: {},
          signal: options?.signal,
        },
        RecurringInvoiceSchema
      )
    },
    delete(id: string, options?: RequestOptions) {
      return Request<DeletedRecurringInvoice>(
        runtime,
        { method: 'DELETE', path: path(id), signal: options?.signal },
        DeletedRecurringInvoiceSchema
      )
    },
    listInvoices(id: string, options?: RequestOptions) {
      return Request<InvoiceList>(
        runtime,
        {
          method: 'GET',
          path: `${path(id)}/invoices`,
          signal: options?.signal,
        },
        InvoiceListSchema
      )
    },
  }
}
