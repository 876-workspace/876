import { nowUnixSeconds } from '@876/core/timestamps'

import { buildCommercialLines } from '@/modules/commercial-lines'
import { hasEnabledCurrency } from '@/modules/currencies'
import { generateId } from '@/platform/ids'

import {
  findSalesOrderRow,
  resolveSalesOrderDefaults,
  runSalesOrderTransaction,
  updateDraftSalesOrderRow,
} from '../repositories/sales-orders'
import { err, ok } from '../repositories/result'
import type { ServiceResult } from '../schemas/api'
import type { SalesOrderUpdateParams } from '../schemas/sales-order'

export async function updateSalesOrderWorkflow(
  tenantId: string,
  salesOrderId: string,
  params: SalesOrderUpdateParams
): ServiceResult<{ id: string }> {
  const current = await findSalesOrderRow(tenantId, salesOrderId)
  if (!current)
    return err(
      'The Sales Order was not found.',
      404,
      'billing/sales-order-not-found'
    )
  if (current.status !== 'DRAFT')
    return err(
      'This Sales Order cannot be changed from its current status.',
      409,
      'billing/sales-order-invalid-state'
    )

  const customerId = params.customerId ?? current.customerId
  const salespersonId =
    params.salespersonId === undefined
      ? current.salespersonId
      : params.salespersonId
  const defaults = await resolveSalesOrderDefaults(
    tenantId,
    customerId,
    salespersonId
  )
  if (!defaults)
    return err(
      'The selected customer was not found.',
      404,
      'billing/sales-order-customer-not-found'
    )
  if (salespersonId && !defaults.salesperson)
    return err('The selected salesperson was not found.', 404)

  const currency = params.currency ?? current.currency
  if (!(await hasEnabledCurrency(tenantId, currency)))
    return err(
      'Enable the Sales Order currency before using it.',
      422,
      'billing/sales-order-currency-disabled'
    )

  const priceListId =
    params.priceListId !== undefined
      ? params.priceListId
      : params.customerId !== undefined
        ? defaults.customer.priceListId
        : current.priceListId
  const commercialContextChanged =
    params.lines !== undefined ||
    params.customerId !== undefined ||
    params.currency !== undefined ||
    params.priceListId !== undefined
  const sourceLines =
    params.lines ??
    current.lines.map((line) => ({
      itemId: line.itemId,
      variantId: line.variantId,
      priceId: line.priceId,
      taxRateId: line.taxRateId,
      description: line.description,
      quantity: line.quantity,
      unitAmount: line.unitAmount,
      taxAmount: line.taxAmount,
      discountAmount: line.discountAmount,
    }))
  const prepared = commercialContextChanged
    ? await buildCommercialLines(tenantId, currency, sourceLines, priceListId)
    : null
  if (prepared?.error)
    return err(
      prepared.error,
      422,
      'billing/sales-order-invalid-lines'
    )

  const now = nowUnixSeconds()
  const replacingCustomer = params.customerId !== undefined
  const replacingSalesperson = params.salespersonId !== undefined

  const updated = await runSalesOrderTransaction((tx) =>
    updateDraftSalesOrderRow(tx, {
      tenantId,
      salesOrderId,
      ...(replacingCustomer
        ? {
            customerId: defaults.customer.id,
            customerName: defaults.customer.name,
            customerEmail: defaults.customer.email,
            billingAddressSnapshot: defaults.billingAddressSnapshot,
            shippingAddressSnapshot: defaults.shippingAddressSnapshot,
          }
        : {}),
      ...(replacingSalesperson
        ? {
            salespersonId: defaults.salesperson?.id ?? null,
            salespersonName: defaults.salesperson?.name ?? null,
          }
        : {}),
      ...(prepared
        ? {
            priceListId: prepared.data.priceList?.id ?? null,
            priceListName: prepared.data.priceList?.name ?? null,
            subtotalAmount: prepared.data.subtotalAmount,
            taxAmount: prepared.data.taxAmount,
            discountAmount: prepared.data.discountAmount,
            totalAmount: prepared.data.totalAmount,
            lines: prepared.data.lines.map((line) => ({
              ...line,
              id: generateId('SalesOrderLine'),
            })),
          }
        : {}),
      ...(params.currency !== undefined ? { currency } : {}),
      ...(params.referenceNumber !== undefined
        ? { referenceNumber: params.referenceNumber }
        : {}),
      ...(params.taxBehavior !== undefined
        ? { taxBehavior: params.taxBehavior }
        : replacingCustomer
          ? { taxBehavior: defaults.taxBehavior }
          : {}),
      ...(params.orderedAt !== undefined ? { orderedAt: params.orderedAt } : {}),
      ...(params.notes !== undefined ? { notes: params.notes } : {}),
      ...(params.terms !== undefined ? { terms: params.terms } : {}),
      ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
      now,
    })
  )

  return updated
    ? ok({ id: salesOrderId })
    : err(
        'This Sales Order cannot be changed from its current status.',
        409,
        'billing/sales-order-invalid-state'
      )
}
