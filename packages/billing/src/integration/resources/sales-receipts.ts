import {
  BillingSalesReceiptListSchema,
  BillingSalesReceiptSchema,
} from '../types/sales-receipt.schema'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type {
  BillingSalesReceipt,
  BillingSalesReceiptCreateParams,
  BillingSalesReceiptList,
  BillingSalesReceiptListParams,
  BillingSalesReceiptQuoteConversionParams,
  BillingSalesReceiptRefundParams,
  BillingSalesReceiptVoidParams,
} from '../types/sales-receipt'
import type { IntegrationCreateOptions } from '../types'

function collectionPath(organizationId: string) {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/sales-receipts`
}

function resourcePath(organizationId: string, salesReceiptId: string) {
  return `${collectionPath(organizationId)}/${encodeURIComponent(salesReceiptId)}`
}

/** Organization-scoped Sales Receipt integration operations. */
export function createIntegrationSalesReceiptsResource(
  runtime: IntegrationRuntime
) {
  return {
    list(
      organizationId: string,
      params: BillingSalesReceiptListParams = {}
    ) {
      return IntegrationRequest<BillingSalesReceiptList>(
        runtime,
        {
          method: 'GET',
          path: collectionPath(organizationId),
          query: { status: params.status },
        },
        BillingSalesReceiptListSchema
      )
    },

    retrieve(organizationId: string, salesReceiptId: string) {
      return IntegrationRequest<BillingSalesReceipt>(
        runtime,
        { method: 'GET', path: resourcePath(organizationId, salesReceiptId) },
        BillingSalesReceiptSchema
      )
    },

    create(
      organizationId: string,
      params: BillingSalesReceiptCreateParams,
      options: IntegrationCreateOptions
    ) {
      return IntegrationRequest<BillingSalesReceipt>(
        runtime,
        {
          method: 'POST',
          path: collectionPath(organizationId),
          body: params,
          headers: { 'Idempotency-Key': options.idempotencyKey },
        },
        BillingSalesReceiptSchema
      )
    },

    refund(
      organizationId: string,
      salesReceiptId: string,
      params: BillingSalesReceiptRefundParams,
      options: IntegrationCreateOptions
    ) {
      return IntegrationRequest<BillingSalesReceipt>(
        runtime,
        {
          method: 'POST',
          path: `${resourcePath(organizationId, salesReceiptId)}/refund`,
          body: params,
          headers: { 'Idempotency-Key': options.idempotencyKey },
        },
        BillingSalesReceiptSchema
      )
    },

    void(
      organizationId: string,
      salesReceiptId: string,
      params: BillingSalesReceiptVoidParams,
      options: IntegrationCreateOptions
    ) {
      return IntegrationRequest<BillingSalesReceipt>(
        runtime,
        {
          method: 'POST',
          path: `${resourcePath(organizationId, salesReceiptId)}/void`,
          body: params,
          headers: { 'Idempotency-Key': options.idempotencyKey },
        },
        BillingSalesReceiptSchema
      )
    },

    convertQuote(
      organizationId: string,
      quoteId: string,
      params: BillingSalesReceiptQuoteConversionParams,
      options: IntegrationCreateOptions
    ) {
      return IntegrationRequest<BillingSalesReceipt>(
        runtime,
        {
          method: 'POST',
          path: `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/quotes/${encodeURIComponent(quoteId)}/convert-to-sales-receipt`,
          body: params,
          headers: { 'Idempotency-Key': options.idempotencyKey },
        },
        BillingSalesReceiptSchema
      )
    },
  }
}
