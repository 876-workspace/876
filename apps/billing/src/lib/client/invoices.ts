import type {
  InvoiceCreated,
  InvoiceCreateInput,
  InvoiceDeleted,
  InvoiceFinalizeParams,
  InvoiceResource,
  InvoiceUpdated,
  InvoiceUpdateInput,
  InvoiceVoidParams,
} from '@/types/invoice'

import { request } from './request'

export const create = (params: InvoiceCreateInput) =>
  request<InvoiceCreated>('/api/v1/invoices', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const retrieve = (invoiceId: string) =>
  request<InvoiceResource>(
    `/api/v1/invoices/${encodeURIComponent(invoiceId)}`,
    {
      method: 'GET',
    }
  )

export const update = (invoiceId: string, params: InvoiceUpdateInput) =>
  request<InvoiceUpdated>(`/api/v1/invoices/${encodeURIComponent(invoiceId)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const finalize = (invoiceId: string, params: InvoiceFinalizeParams) =>
  request<InvoiceUpdated>(
    `/api/v1/invoices/${encodeURIComponent(invoiceId)}/finalize`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  )

export const voidInvoice = (invoiceId: string, params: InvoiceVoidParams) =>
  request<InvoiceUpdated>(
    `/api/v1/invoices/${encodeURIComponent(invoiceId)}/void`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  )

const deleteInvoice = (invoiceId: string) =>
  request<InvoiceDeleted>(`/api/v1/invoices/${encodeURIComponent(invoiceId)}`, {
    method: 'DELETE',
  })

export const invoices = {
  create,
  retrieve,
  update,
  finalize,
  void: voidInvoice,
  delete: deleteInvoice,
}
