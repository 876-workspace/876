import { nowUnixSeconds } from '@876/core/timestamps'

import { AppHttpError } from '@/http/errors'
import { claimCommand, completeCommand } from '@/modules/command-idempotency'
import { buildCommercialLines } from '@/modules/commercial-lines'
import { hasEnabledCurrency } from '@/modules/currencies'
import { generateId } from '@/platform/ids'
import { isRetryableTransactionError } from '@/platform/prisma-errors'
import type { IdempotencyContext } from '@/types/commerce'

import { nextDocumentNumber } from '../document-numbers.repository'
import {
  createSalesOrderRow,
  resolveSalesOrderDefaults,
  runSalesOrderTransaction,
} from '../repositories/sales-orders'
import { err, ok } from '../repositories/result'
import type { ServiceResult } from '../schemas/api'
import type { SalesOrderCreateParams } from '../schemas/sales-order'

/** Creates one draft Sales Order from canonical customer/catalog snapshots. */
export async function createSalesOrderWorkflow(
  tenantId: string,
  params: SalesOrderCreateParams,
  idempotency?: IdempotencyContext
): ServiceResult<{ id: string; replayed?: true }> {
  const defaults = await resolveSalesOrderDefaults(
    tenantId,
    params.customerId,
    params.salespersonId
  )
  if (!defaults) return err('The selected customer was not found.', 404)
  if (params.salespersonId && !defaults.salesperson)
    return err('The selected salesperson was not found.', 404)

  const currency =
    params.currency ??
    defaults.customer.defaultCurrency ??
    defaults.tenant.defaultCurrency
  if (!(await hasEnabledCurrency(tenantId, currency)))
    return err(
      'Enable the Sales Order currency before using it.',
      422,
      'billing/sales-order-currency-disabled'
    )

  const priceListId =
    params.priceListId === undefined
      ? defaults.customer.priceListId
      : params.priceListId
  const prepared = await buildCommercialLines(
    tenantId,
    currency,
    params.lines,
    priceListId
  )
  if (prepared.error !== null)
    return err(
      prepared.error,
      422,
      'billing/sales-order-invalid-lines'
    )

  const now = nowUnixSeconds()
  const salesOrderId = generateId('SalesOrder')
  const lines = prepared.data.lines.map((line) => ({
    ...line,
    id: generateId('SalesOrderLine'),
  }))

  try {
    return await runSalesOrderTransaction(async (tx) => {
      let claimId: string | undefined
      if (idempotency) {
        const claim = await claimCommand(tx, tenantId, {
          operation: 'sales-order-create',
          key: idempotency.key,
          requestHash: idempotency.requestHash,
          resource: { type: 'sales-order', id: salesOrderId },
          httpStatus: 201,
          now,
        })
        if (claim.error !== null)
          return err(claim.error, claim.status, claim.code)
        if (claim.data.state === 'replayed')
          return ok({ id: claim.data.resource.id, replayed: true })
        claimId = claim.data.claimId
      }

      const number = await nextDocumentNumber(
        tenantId,
        'SALES_ORDER',
        now,
        tx
      )
      await createSalesOrderRow(tx, {
        id: salesOrderId,
        tenantId,
        customerId: defaults.customer.id,
        salespersonId: defaults.salesperson?.id ?? null,
        salespersonName: defaults.salesperson?.name ?? null,
        priceListId: prepared.data.priceList?.id ?? null,
        priceListName: prepared.data.priceList?.name ?? null,
        number,
        currency,
        referenceNumber: params.referenceNumber ?? null,
        taxBehavior: params.taxBehavior ?? defaults.taxBehavior,
        customerName: defaults.customer.name,
        customerEmail: defaults.customer.email,
        billingAddressSnapshot: defaults.billingAddressSnapshot,
        shippingAddressSnapshot: defaults.shippingAddressSnapshot,
        orderedAt: params.orderedAt ?? now,
        subtotalAmount: prepared.data.subtotalAmount,
        taxAmount: prepared.data.taxAmount,
        discountAmount: prepared.data.discountAmount,
        totalAmount: prepared.data.totalAmount,
        notes: params.notes ?? defaults.notes,
        terms: params.terms ?? defaults.terms,
        metadata: params.metadata ?? null,
        lines,
        now,
      })

      if (claimId) await completeCommand(tx, tenantId, claimId, now)
      return ok({ id: salesOrderId })
    })
  } catch (error) {
    if (error instanceof AppHttpError)
      return err(error.message, error.httpStatus, error.code)
    if (isRetryableTransactionError(error))
      return err(
        'The Sales Order changed while it was being created; retry.',
        409,
        'billing/sales-order-invalid-state'
      )

    console.error('[billing.workflow.sales-orders.create]', error)
    return err('Failed to create the Sales Order.', 500)
  }
}
