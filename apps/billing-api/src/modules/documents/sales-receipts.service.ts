import { AppHttpError } from '@/http/errors'
import type { IntegrationAttribution } from '@/http/integration/idempotency'
import type { IdempotencyContext } from '@/types/commerce'

import { documentList, serializeDocument } from './documents.serializers'
import { salesReceipts } from './repositories/sales-receipts'
import type { ServiceResult } from './schemas/api'
import type {
  SalesReceiptCreateParams,
  SalesReceiptQuoteConversionParams,
  SalesReceiptRefundParams,
  SalesReceiptStatus,
  SalesReceiptVoidParams,
} from './schemas/sales-receipt'
import {
  createSalesReceiptWorkflow,
  refundSalesReceiptWorkflow,
  voidSalesReceiptWorkflow,
} from './workflows'

async function unwrapSalesReceipt<T>(result: Awaited<ServiceResult<T>>): Promise<T> {
  if (result.error === null) return result.data
  const status = result.status ?? 500
  throw new AppHttpError({
    code:
      status === 404
        ? 'sales-receipt/not-found'
        : status === 409
          ? 'sales-receipt/invalid-state'
          : status === 422
            ? 'validation/invalid-request'
            : 'internal/error',
    message: result.error,
    httpStatus: status,
  })
}

async function ownedSalesReceipt(
  tenantId: string,
  id: string,
  sourceAppId?: string
) {
  const row = await salesReceipts.retrieve(tenantId, id, sourceAppId)
  if (row) return row
  throw new AppHttpError({
    code: 'sales-receipt/not-found',
    message: 'Sales Receipt not found.',
    httpStatus: 404,
  })
}

export const salesReceiptsService = {
  async list(
    tenantId: string,
    status?: SalesReceiptStatus,
    sourceAppId?: string,
    url = '/api/v1/sales-receipts'
  ) {
    return documentList(
      'sales_receipt',
      await salesReceipts.list(tenantId, status, sourceAppId),
      url
    )
  },

  async get(tenantId: string, id: string, sourceAppId?: string) {
    return serializeDocument(
      'sales_receipt',
      await ownedSalesReceipt(tenantId, id, sourceAppId)
    )
  },

  async create(
    tenantId: string,
    body: SalesReceiptCreateParams,
    attribution?: IntegrationAttribution | null
  ) {
    const result = await unwrapSalesReceipt(
      await createSalesReceiptWorkflow(tenantId, body, attribution ?? undefined)
    )
    return {
      resource: { object: 'sales_receipt' as const, id: result.id },
      replayed: result.replayed === true,
    }
  },

  async convertQuote(
    tenantId: string,
    quoteId: string,
    body: SalesReceiptQuoteConversionParams,
    attribution?: IntegrationAttribution | null
  ) {
    return this.create(
      tenantId,
      {
        quoteId,
        ...body,
        discountAmount: 0n,
      },
      attribution
    )
  },

  async refund(
    tenantId: string,
    id: string,
    body: SalesReceiptRefundParams,
    sourceAppId?: string,
    idempotency?: IdempotencyContext
  ) {
    if (sourceAppId) await ownedSalesReceipt(tenantId, id, sourceAppId)
    return {
      object: 'sales_receipt' as const,
      ...(await unwrapSalesReceipt(
        await refundSalesReceiptWorkflow(tenantId, id, body, idempotency)
      )),
    }
  },

  async void(
    tenantId: string,
    id: string,
    body: SalesReceiptVoidParams,
    sourceAppId?: string,
    idempotency?: IdempotencyContext
  ) {
    if (sourceAppId) await ownedSalesReceipt(tenantId, id, sourceAppId)
    return {
      object: 'sales_receipt' as const,
      ...(await unwrapSalesReceipt(
        await voidSalesReceiptWorkflow(tenantId, id, body, idempotency)
      )),
    }
  },
}
