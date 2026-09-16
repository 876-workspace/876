import type {
  DocumentEmailComposition,
  DocumentEmailDelivery,
  DocumentEmailPrepareParams,
  DocumentEmailSendParams,
} from '@876/billing'

import type {
  InvoiceCreated,
  InvoiceCreateInput,
  InvoiceDeleted,
  InvoiceFinalizeParams,
  InvoiceResource,
  InvoiceUpdated,
  InvoiceUpdateInput,
  InvoiceVoidParams,
  InvoiceWriteOffParams,
} from '@/types/invoice'

import { request } from './request'

function emailPath(invoiceId: string) {
  return `/api/v1/invoices/${encodeURIComponent(invoiceId)}/email`
}

function prepareEmail(
  invoiceId: string,
  params: DocumentEmailPrepareParams = {}
) {
  const search = new URLSearchParams()
  if (params.senderId) search.set('senderId', params.senderId)
  if (params.templateId) search.set('templateId', params.templateId)
  const query = search.size > 0 ? `?${search.toString()}` : ''
  return request<DocumentEmailComposition>(`${emailPath(invoiceId)}${query}`, {
    method: 'GET',
  })
}

function sendEmail(invoiceId: string, params: DocumentEmailSendParams) {
  return request<DocumentEmailDelivery>(
    `/api/v1/invoices/${encodeURIComponent(invoiceId)}/send-email`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify(params),
    }
  )
}

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

export const send = (invoiceId: string) =>
  request<InvoiceUpdated>(
    `/api/v1/invoices/${encodeURIComponent(invoiceId)}/send`,
    {
      method: 'POST',
      body: JSON.stringify({}),
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

export const writeOff = (
  invoiceId: string,
  params: InvoiceWriteOffParams
) =>
  request<InvoiceUpdated>(
    `/api/v1/invoices/${encodeURIComponent(invoiceId)}/write-off`,
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
  send,
  prepareEmail,
  sendEmail,
  void: voidInvoice,
  writeOff,
  delete: deleteInvoice,
}
