import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  CashSummarySchema,
  CustomerSalesSchema,
  ItemSalesSchema,
  ItemSalesSummarySchema,
  ReceivablesAgingSchema,
  SalesSummarySchema,
  SubscriptionSummarySchema,
} from '../schemas'
import type {
  CashSummary,
  CashSummaryParams,
  CustomerSales,
  CustomerSalesParams,
  ItemSales,
  ItemSalesParams,
  ItemSalesSummary,
  ItemSalesSummaryParams,
  ReceivablesAging,
  ReceivablesAgingParams,
  ReportRangeParams,
  RequestOptions,
  SalesSummary,
  SubscriptionSummary,
  SubscriptionSummaryParams,
} from '../types'

function rangeQuery(params: ReportRangeParams): Record<string, string | number | undefined> {
  return {
    from: params.from,
    to: params.to,
    groupBy: params.groupBy,
    customerId: params.customerId,
    itemId: params.itemId,
  }
}

/** `$876.billing.reports.*` — tenant reporting projections. */
export function createReportsResource(runtime: Runtime) {
  return {
    /** Retrieves gross, credit, and net sales bucketed in the tenant timezone. */
    salesSummary(params: ReportRangeParams, options?: RequestOptions) {
      return Request<SalesSummary>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/reports/sales-summary',
          query: rangeQuery(params),
          signal: options?.signal,
        },
        SalesSummarySchema
      )
    },
    /** Retrieves received cash, refunds, and net cash per bucket. */
    cashSummary(params: CashSummaryParams, options?: RequestOptions) {
      return Request<CashSummary>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/reports/cash-summary',
          query: {
            from: params.from,
            to: params.to,
            groupBy: params.groupBy,
            customerId: params.customerId,
          },
          signal: options?.signal,
        },
        CashSummarySchema
      )
    },
    /** Retrieves receivables aging buckets plus top debtors per currency. */
    receivablesAging(params: ReceivablesAgingParams = {}, options?: RequestOptions) {
      return Request<ReceivablesAging>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/reports/receivables-aging',
          query: {
            asOf: params.asOf,
            customerId: params.customerId,
            limit: params.limit,
          },
          signal: options?.signal,
        },
        ReceivablesAgingSchema
      )
    },
    /** Retrieves the top-N item sales rows per variant and currency. */
    itemSales(params: ItemSalesParams, options?: RequestOptions) {
      return Request<ItemSales>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/reports/item-sales',
          query: {
            from: params.from,
            to: params.to,
            itemId: params.itemId,
            limit: params.limit,
          },
          signal: options?.signal,
        },
        ItemSalesSchema
      )
    },
    /** Retrieves the top-N customers by net sales. */
    customerSales(params: CustomerSalesParams, options?: RequestOptions) {
      return Request<CustomerSales>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/reports/customer-sales',
          query: {
            from: params.from,
            to: params.to,
            limit: params.limit,
          },
          signal: options?.signal,
        },
        CustomerSalesSchema
      )
    },
    /** Retrieves current MRR/ARR, lifecycle buckets, and churn. */
    subscriptionSummary(
      params: SubscriptionSummaryParams,
      options?: RequestOptions
    ) {
      return Request<SubscriptionSummary>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/reports/subscription-summary',
          query: {
            from: params.from,
            to: params.to,
            groupBy: params.groupBy,
            customerId: params.customerId,
          },
          signal: options?.signal,
        },
        SubscriptionSummarySchema
      )
    },
  }
}
