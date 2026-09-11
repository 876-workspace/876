import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  SalesReceiptListSchema,
  SalesReceiptSchema,
} from '../types/sales-receipt.schema'
import type {
  SalesReceipt,
  SalesReceiptCreateParams,
  SalesReceiptList,
  SalesReceiptListParams,
  SalesReceiptRefundParams,
  SalesReceiptVoidParams,
} from '../types/sales-receipt'
import type { RequestOptions } from '../types/common'

function resourcePath(salesReceiptId: string) {
  return `/api/v1/sales-receipts/${encodeURIComponent(salesReceiptId)}`
}

/** `$876.billing.salesReceipts.*` — immediate paid-sale operations. */
export function createSalesReceiptsResource(runtime: Runtime) {
  return {
    list(params: SalesReceiptListParams = {}, options?: RequestOptions) {
      return Request<SalesReceiptList>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/sales-receipts',
          query: params as Record<string, string | number | boolean | undefined>,
          signal: options?.signal,
        },
        SalesReceiptListSchema
      )
    },

    create(params: SalesReceiptCreateParams, options?: RequestOptions) {
      return Request<SalesReceipt>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/sales-receipts',
          body: params,
          signal: options?.signal,
        },
        SalesReceiptSchema
      )
    },

    retrieve(salesReceiptId: string, options?: RequestOptions) {
      return Request<SalesReceipt>(
        runtime,
        {
          method: 'GET',
          path: resourcePath(salesReceiptId),
          signal: options?.signal,
        },
        SalesReceiptSchema
      )
    },

    refund(
      salesReceiptId: string,
      params: SalesReceiptRefundParams,
      options?: RequestOptions
    ) {
      return Request<SalesReceipt>(
        runtime,
        {
          method: 'POST',
          path: `${resourcePath(salesReceiptId)}/refund`,
          body: params,
          signal: options?.signal,
        },
        SalesReceiptSchema
      )
    },

    void(
      salesReceiptId: string,
      params: SalesReceiptVoidParams = {},
      options?: RequestOptions
    ) {
      return Request<SalesReceipt>(
        runtime,
        {
          method: 'POST',
          path: `${resourcePath(salesReceiptId)}/void`,
          body: params,
          signal: options?.signal,
        },
        SalesReceiptSchema
      )
    },
  }
}
