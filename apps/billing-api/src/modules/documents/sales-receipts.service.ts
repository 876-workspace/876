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

type SalesReceiptProjectionRow = {
  totalAmount: bigint
  creditNotes: Array<{
    status: string
    totalAmount: bigint
    refunds: Array<{ amount: bigint }>
  }>
}

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

function salesReceiptCorrectionProjection(row: SalesReceiptProjectionRow) {
  const activeCreditNotes = row.creditNotes.filter(
    (creditNote) => creditNote.status !== 'VOID'
  )
  const creditedAmount = activeCreditNotes.reduce(
    (total, creditNote) => total + creditNote.totalAmount,
    0n
  )
  const refundedAmount = activeCreditNotes.reduce(
    (total, creditNote) =>
      total +
      creditNote.refunds.reduce(
        (refundTotal, refund) => refundTotal + refund.amount,
        0n
      ),
    0n
  )
  const refundableAmount =
    row.totalAmount > creditedAmount ? row.totalAmount - creditedAmount : 0n
  const refundStatus =
    refundedAmount <= 0n
      ? ('NONE' as const)
      : refundedAmount >= row.totalAmount
        ? ('REFUNDED' as const)
        : ('PARTIALLY_REFUNDED' as const)

  return {
    creditedAmount: creditedAmount.toString(),
    refundedAmount: refundedAmount.toString(),
    refundableAmount: refundableAmount.toString(),
    refundStatus,
  }
}

function serializeSalesReceipt<T extends SalesReceiptProjectionRow>(row: T) {
  return {
    ...serializeDocument('sales_receipt', row),
    ...salesReceiptCorrectionProjection(row),
  }
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

async function serializedSalesReceipt(
  tenantId: string,
  id: string,
  sourceAppId?: string
) {
  return serializeSalesReceipt(
    await ownedSalesReceipt(tenantId, id, sourceAppId)
  )
}

async function createSalesReceipt(
  tenantId: string,
  body: SalesReceiptCreateParams,
  attribution?: IntegrationAttribution | null
) {
  const result = await unwrapSalesReceipt(
    await createSalesReceiptWorkflow(tenantId, body, attribution ?? undefined)
  )
  return {
    resource: await serializedSalesReceipt(
      tenantId,
      result.id,
      attribution?.sourceAppId
    ),
    replayed: result.replayed === true,
  }
}

export const salesReceiptsService = {
  async list(
    tenantId: string,
    status?: SalesReceiptStatus,
    sourceAppId?: string,
    url = '/api/v1/sales-receipts',
    customerId?: string
  ) {
    const rows = await salesReceipts.list(
      tenantId,
      status,
      sourceAppId,
      customerId
    )
    return {
      ...documentList('sales_receipt', rows, url),
      data: rows.map(serializeSalesReceipt),
    }
  },

  get: serializedSalesReceipt,

  create: createSalesReceipt,

  async convertQuote(
    tenantId: string,
    quoteId: string,
    body: SalesReceiptQuoteConversionParams,
    attribution?: IntegrationAttribution | null
  ) {
    return createSalesReceipt(
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
    const result = await unwrapSalesReceipt(
      await refundSalesReceiptWorkflow(tenantId, id, body, idempotency)
    )
    return serializedSalesReceipt(tenantId, result.id, sourceAppId)
  },

  async void(
    tenantId: string,
    id: string,
    body: SalesReceiptVoidParams,
    sourceAppId?: string,
    idempotency?: IdempotencyContext
  ) {
    if (sourceAppId) await ownedSalesReceipt(tenantId, id, sourceAppId)
    const result = await unwrapSalesReceipt(
      await voidSalesReceiptWorkflow(tenantId, id, body, idempotency)
    )
    return serializedSalesReceipt(tenantId, result.id, sourceAppId)
  },
}
