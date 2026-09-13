import { nowUnixSeconds } from '@876/core/timestamps'

import { AppHttpError, appError } from '@/http/errors'
import { claimCommand, completeCommand } from '@/modules/command-idempotency'
import { isRetryableTransactionError } from '@/platform/prisma-errors'
import type { IdempotencyContext } from '@/types/commerce'

import {
  applySalesOrderTransition,
  findActiveInvoiceForSalesOrder,
  findSalesOrderForLifecycle,
  runSalesOrderTransaction,
} from '../repositories/sales-orders'
import { err, ok } from '../repositories/result'
import type { ServiceResult } from '../schemas/api'

type SalesOrderAction = 'confirm' | 'cancel' | 'complete'

type Transition = {
  from: 'DRAFT' | 'CONFIRMED'
  to: 'CONFIRMED' | 'COMPLETED' | 'CANCELED'
  timestamp: 'confirmedAt' | 'completedAt' | 'canceledAt'
}

function transitionFor(
  status: 'DRAFT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED',
  action: SalesOrderAction
): Transition | null {
  if (status === 'DRAFT' && action === 'confirm')
    return { from: 'DRAFT', to: 'CONFIRMED', timestamp: 'confirmedAt' }
  if (status === 'DRAFT' && action === 'cancel')
    return { from: 'DRAFT', to: 'CANCELED', timestamp: 'canceledAt' }
  if (status === 'CONFIRMED' && action === 'complete')
    return { from: 'CONFIRMED', to: 'COMPLETED', timestamp: 'completedAt' }
  if (status === 'CONFIRMED' && action === 'cancel')
    return { from: 'CONFIRMED', to: 'CANCELED', timestamp: 'canceledAt' }
  return null
}

/** Executes an explicit Sales Order state command; arbitrary status PATCH is forbidden. */
export async function transitionSalesOrderWorkflow(
  tenantId: string,
  salesOrderId: string,
  action: SalesOrderAction,
  idempotency?: IdempotencyContext
): ServiceResult<{ id: string }> {
  const now = nowUnixSeconds()

  try {
    return await runSalesOrderTransaction(async (tx) => {
      let claimId: string | undefined
      if (idempotency) {
        const claim = await claimCommand(tx, tenantId, {
          operation: `sales-order-${action}`,
          key: idempotency.key,
          requestHash: idempotency.requestHash,
          resource: { type: 'sales-order', id: salesOrderId },
          httpStatus: 200,
          now,
        })
        if (claim.error !== null)
          return err(claim.error, claim.status, claim.code)
        if (claim.data.state === 'replayed') return ok({ id: salesOrderId })
        claimId = claim.data.claimId
      }

      const order = await findSalesOrderForLifecycle(tx, tenantId, salesOrderId)
      if (!order) throw appError('billing/sales-order-not-found')

      const transition = transitionFor(order.status, action)
      if (!transition) throw appError('billing/sales-order-invalid-state')

      if (action === 'cancel' && order.status === 'CONFIRMED') {
        const invoice = await findActiveInvoiceForSalesOrder(
          tx,
          tenantId,
          salesOrderId
        )
        if (invoice) throw appError('billing/sales-order-invalid-state')
      }

      const changed = await applySalesOrderTransition(tx, {
        tenantId,
        salesOrderId,
        ...transition,
        now,
      })
      if (changed.count !== 1)
        throw appError('billing/sales-order-invalid-state')

      if (claimId) await completeCommand(tx, tenantId, claimId, now)
      return ok({ id: salesOrderId })
    })
  } catch (error) {
    if (error instanceof AppHttpError)
      return err(error.message, error.httpStatus, error.code)
    if (isRetryableTransactionError(error))
      return err(
        'The Sales Order changed while this command was running; retry.',
        409,
        'billing/sales-order-invalid-state'
      )

    console.error('[billing.workflow.sales-orders.transition]', error)
    return err('Failed to update the Sales Order.', 500)
  }
}
