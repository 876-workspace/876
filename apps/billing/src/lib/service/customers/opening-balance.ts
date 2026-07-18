import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { CustomerOpeningBalanceParams } from '@/types/customer'
import type { ServiceResult } from '@/types/api'

import { nextDocumentNumber } from '../documents/numbers'
import { recordLedgerEntry } from '../ledger'
import { err, ok } from '../result'
import { hasEnabledCurrency } from '../shared'
import { recomputeCustomerAr } from './ar'

/** Records a dated receivable brought forward from a previous system. */
export async function recordOpeningBalance(
  tenantId: string,
  customerId: string,
  params: CustomerOpeningBalanceParams
): ServiceResult<{ id: string }> {
  if (!(await hasEnabledCurrency(tenantId, params.currency)))
    return err('Enable the opening-balance currency before using it.', 422)

  const now = nowUnixSeconds()

  try {
    const invoiceId = await prisma.$transaction(
      async (tx) => {
        const customer = await tx.customer.findFirst({
          where: { id: customerId, tenantId, status: 'ACTIVE' },
        })
        if (!customer) throw new Error('CUSTOMER_NOT_FOUND')

        const number = await nextDocumentNumber(tenantId, 'INVOICE', now, tx)
        const id = generateId('Invoice')
        await tx.invoice.create({
          data: {
            id,
            tenantId,
            customerId,
            number,
            status: 'OPEN',
            billingReason: 'OPENING_BALANCE',
            currency: params.currency,
            issueAt: params.asOf,
            dueAt: params.asOf,
            finalizedAt: now,
            subtotalAmount: params.amount,
            totalAmount: params.amount,
            amountDue: params.amount,
            notes: params.reference
              ? `Opening balance: ${params.reference}`
              : 'Opening balance',
            createdAt: now,
            updatedAt: now,
            lines: {
              create: {
                id: generateId('InvoiceLine'),
                description: 'Opening balance',
                quantity: 1,
                unitAmount: params.amount,
                totalAmount: params.amount,
                createdAt: now,
                updatedAt: now,
              },
            },
          },
        })
        await recordLedgerEntry(tx, {
          tenantId,
          customerId,
          invoiceId: id,
          type: 'OPENING_BALANCE',
          direction: 'DEBIT',
          amount: params.amount,
          currency: params.currency,
          description: params.reference
            ? `Opening balance: ${params.reference}`
            : 'Opening balance',
          idempotencyKey: `invoice:${id}:finalized`,
          effectiveAt: params.asOf,
          createdAt: now,
        })
        await recomputeCustomerAr(tx, tenantId, customerId, now)

        return id
      },
      { isolationLevel: 'Serializable' }
    )

    return ok({ id: invoiceId })
  } catch (error) {
    if (error instanceof Error && error.message === 'CUSTOMER_NOT_FOUND')
      return err('Customer not found.', 404)

    console.error('[billing.service.customers.opening-balance]', error)
    return err('Failed to record the opening balance.', 500)
  }
}
