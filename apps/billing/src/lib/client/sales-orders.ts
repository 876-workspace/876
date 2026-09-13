import type { InvoiceResource } from '@/types/invoice'
import type {
  SalesOrderCreateInput,
  SalesOrderResource,
} from '@/types/sales-order'

import { request } from './request'

const path = (salesOrderId: string) =>
  `/api/v1/sales-orders/${encodeURIComponent(salesOrderId)}`

const transition = (
  salesOrderId: string,
  action: 'confirm' | 'cancel' | 'complete'
) =>
  request<SalesOrderResource>(`${path(salesOrderId)}/${action}`, {
    method: 'POST',
    body: JSON.stringify({}),
  })

export const salesOrders = {
  create: (params: SalesOrderCreateInput) =>
    request<SalesOrderResource>('/api/v1/sales-orders', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  retrieve: (salesOrderId: string) =>
    request<SalesOrderResource>(path(salesOrderId), { method: 'GET' }),
  update: (salesOrderId: string, params: Partial<SalesOrderCreateInput>) =>
    request<SalesOrderResource>(path(salesOrderId), {
      method: 'PATCH',
      body: JSON.stringify(params),
    }),
  confirm: (salesOrderId: string) => transition(salesOrderId, 'confirm'),
  cancel: (salesOrderId: string) => transition(salesOrderId, 'cancel'),
  complete: (salesOrderId: string) => transition(salesOrderId, 'complete'),
  convertToInvoice: (salesOrderId: string) =>
    request<InvoiceResource>(`${path(salesOrderId)}/convert-to-invoice`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
}
