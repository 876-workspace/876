import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  DeletedSalesOrderSchema,
  SalesOrderListSchema,
  SalesOrderSchema,
} from '../types/sales-order.schema'
import type {
  DeletedSalesOrder,
  SalesOrder,
  SalesOrderCreateParams,
  SalesOrderList,
  SalesOrderListParams,
  SalesOrderUpdateParams,
} from '../types/sales-order'
import type { RequestOptions } from '../types/common'

function resourcePath(salesOrderId: string) {
  return `/api/v1/sales-orders/${encodeURIComponent(salesOrderId)}`
}

function lifecycle(
  runtime: Runtime,
  salesOrderId: string,
  action: string,
  options?: RequestOptions
) {
  return Request<SalesOrder>(
    runtime,
    {
      method: 'POST',
      path: `${resourcePath(salesOrderId)}/${action}`,
      signal: options?.signal,
    },
    SalesOrderSchema
  )
}

/** `$876.billing.salesOrders.*` — commercial Sales Order operations. */
export function createSalesOrdersResource(runtime: Runtime) {
  return {
    list(params: SalesOrderListParams = {}, options?: RequestOptions) {
      return Request<SalesOrderList>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/sales-orders',
          query: params as Record<string, string | number | boolean | undefined>,
          signal: options?.signal,
        },
        SalesOrderListSchema
      )
    },

    create(params: SalesOrderCreateParams, options?: RequestOptions) {
      return Request<SalesOrder>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/sales-orders',
          body: params,
          signal: options?.signal,
        },
        SalesOrderSchema
      )
    },

    retrieve(salesOrderId: string, options?: RequestOptions) {
      return Request<SalesOrder>(
        runtime,
        {
          method: 'GET',
          path: resourcePath(salesOrderId),
          signal: options?.signal,
        },
        SalesOrderSchema
      )
    },

    update(
      salesOrderId: string,
      params: SalesOrderUpdateParams,
      options?: RequestOptions
    ) {
      return Request<SalesOrder>(
        runtime,
        {
          method: 'PATCH',
          path: resourcePath(salesOrderId),
          body: params,
          signal: options?.signal,
        },
        SalesOrderSchema
      )
    },

    delete(salesOrderId: string, options?: RequestOptions) {
      return Request<DeletedSalesOrder>(
        runtime,
        {
          method: 'DELETE',
          path: resourcePath(salesOrderId),
          signal: options?.signal,
        },
        DeletedSalesOrderSchema
      )
    },

    submit(salesOrderId: string, options?: RequestOptions) {
      return lifecycle(runtime, salesOrderId, 'submit', options)
    },

    confirm(salesOrderId: string, options?: RequestOptions) {
      return lifecycle(runtime, salesOrderId, 'confirm', options)
    },

    startProcessing(salesOrderId: string, options?: RequestOptions) {
      return lifecycle(runtime, salesOrderId, 'start-processing', options)
    },

    complete(salesOrderId: string, options?: RequestOptions) {
      return lifecycle(runtime, salesOrderId, 'complete', options)
    },

    cancel(salesOrderId: string, options?: RequestOptions) {
      return lifecycle(runtime, salesOrderId, 'cancel', options)
    },
  }
}
