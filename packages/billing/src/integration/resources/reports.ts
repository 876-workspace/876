import {
  BillingCashSummarySchema,
  BillingCustomerSalesSchema,
  BillingItemSalesSchema,
  BillingReceivablesAgingSchema,
  BillingSalesSummarySchema,
  BillingSubscriptionSummarySchema,
} from '../schemas'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type {
  BillingCashSummary,
  BillingCashSummaryParams,
  BillingCustomerSales,
  BillingCustomerSalesParams,
  BillingItemSales,
  BillingItemSalesParams,
  BillingReceivablesAging,
  BillingReceivablesAgingParams,
  BillingReportRangeParams,
  BillingSalesSummary,
  BillingSubscriptionSummary,
  BillingSubscriptionSummaryParams,
} from '../types'

function basePath(organizationId: string): string {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/reports`
}

/** Organization-scoped reporting projections for connected systems. */
export function createIntegrationReportsResource(runtime: IntegrationRuntime) {
  return {
    salesSummary(organizationId: string, params: BillingReportRangeParams) {
      return IntegrationRequest<BillingSalesSummary>(
        runtime,
        {
          method: 'GET',
          path: `${basePath(organizationId)}/sales-summary`,
          query: {
            from: params.from,
            to: params.to,
            groupBy: params.groupBy,
            customerId: params.customerId,
            itemId: params.itemId,
          },
        },
        BillingSalesSummarySchema
      )
    },
    cashSummary(organizationId: string, params: BillingCashSummaryParams) {
      return IntegrationRequest<BillingCashSummary>(
        runtime,
        {
          method: 'GET',
          path: `${basePath(organizationId)}/cash-summary`,
          query: {
            from: params.from,
            to: params.to,
            groupBy: params.groupBy,
            customerId: params.customerId,
          },
        },
        BillingCashSummarySchema
      )
    },
    receivablesAging(
      organizationId: string,
      params: BillingReceivablesAgingParams = {}
    ) {
      return IntegrationRequest<BillingReceivablesAging>(
        runtime,
        {
          method: 'GET',
          path: `${basePath(organizationId)}/receivables-aging`,
          query: {
            asOf: params.asOf,
            customerId: params.customerId,
            limit: params.limit,
          },
        },
        BillingReceivablesAgingSchema
      )
    },
    itemSales(organizationId: string, params: BillingItemSalesParams) {
      return IntegrationRequest<BillingItemSales>(
        runtime,
        {
          method: 'GET',
          path: `${basePath(organizationId)}/item-sales`,
          query: {
            from: params.from,
            to: params.to,
            itemId: params.itemId,
            limit: params.limit,
          },
        },
        BillingItemSalesSchema
      )
    },
    customerSales(organizationId: string, params: BillingCustomerSalesParams) {
      return IntegrationRequest<BillingCustomerSales>(
        runtime,
        {
          method: 'GET',
          path: `${basePath(organizationId)}/customer-sales`,
          query: {
            from: params.from,
            to: params.to,
            limit: params.limit,
          },
        },
        BillingCustomerSalesSchema
      )
    },
    subscriptionSummary(
      organizationId: string,
      params: BillingSubscriptionSummaryParams
    ) {
      return IntegrationRequest<BillingSubscriptionSummary>(
        runtime,
        {
          method: 'GET',
          path: `${basePath(organizationId)}/subscription-summary`,
          query: {
            from: params.from,
            to: params.to,
            groupBy: params.groupBy,
            customerId: params.customerId,
          },
        },
        BillingSubscriptionSummarySchema
      )
    },
  }
}
