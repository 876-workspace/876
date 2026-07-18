import type { Prisma } from '@/lib/db/generated/prisma/client'

import { Resource } from './billing-route'

type PaymentRow = Prisma.PaymentGetPayload<{
  include: {
    customer: { select: { id: true; name: true } }
    paymentMode: true
    depositAccount: true
    invoiceAllocations: { include: { invoice: true } }
  }
}> & {
  bankTransaction?: Prisma.BankTransactionGetPayload<object> | null
}

/** Serializes one payment aggregate without exposing reversal-only metadata. */
export function PaymentResource(value: PaymentRow) {
  const allocations = value.invoiceAllocations.map((allocation) =>
    Resource('payment_allocation', {
      id: allocation.id,
      amount: allocation.amount,
      createdAt: allocation.createdAt,
      updatedAt: allocation.updatedAt,
      invoice: Resource('invoice', {
        id: allocation.invoice.id,
        number: allocation.invoice.number,
        totalAmount: allocation.invoice.totalAmount,
        amountDue: allocation.invoice.amountDue,
        status: allocation.invoice.status,
      }),
    })
  )

  return Resource('payment', {
    id: value.id,
    number: value.number,
    amount: value.amount,
    unappliedAmount: value.unappliedAmount,
    status: value.status,
    providerConnectionId: value.providerConnectionId,
    providerPaymentId: value.providerPaymentId,
    bankCharges: value.bankCharges,
    currency: value.currency,
    paymentDate: value.paymentDate,
    referenceNumber: value.referenceNumber,
    notes: value.notes,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    customer: Resource('customer', {
      id: value.customer.id,
      name: value.customer.name,
    }),
    paymentMode: Resource('payment_mode', {
      id: value.paymentMode.id,
      name: value.paymentMode.name,
      isDefault: value.paymentMode.isDefault,
      isActive: value.paymentMode.isActive,
      isSystem: value.paymentMode.isSystem,
      createdAt: value.paymentMode.createdAt,
      updatedAt: value.paymentMode.updatedAt,
    }),
    depositAccount: Resource('bank_account', {
      id: value.depositAccount.id,
      name: value.depositAccount.name,
      accountType: value.depositAccount.accountType,
      currency: value.depositAccount.currency,
    }),
    invoiceAllocations: allocations,
    ...(value.bankTransaction !== undefined && {
      bankTransaction: value.bankTransaction
        ? Resource('bank_transaction', {
            id: value.bankTransaction.id,
            accountId: value.bankTransaction.accountId,
            paymentId: value.bankTransaction.paymentId,
            type: value.bankTransaction.type,
            amount: value.bankTransaction.amount,
            date: value.bankTransaction.date,
            description: value.bankTransaction.description,
            status: value.bankTransaction.status,
            reference: value.bankTransaction.reference,
            createdAt: value.bankTransaction.createdAt,
            updatedAt: value.bankTransaction.updatedAt,
          })
        : null,
    }),
  })
}
