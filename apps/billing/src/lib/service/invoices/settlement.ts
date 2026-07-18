import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'

type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$extends' | '$on' | '$transaction' | '$use'
>

interface OpenInvoice {
  id: string
  tenantId: string
  customerId: string
  subscriptionId: string | null
  number: string
  currency: string
  status: 'OPEN'
  amountDue: bigint
  paidAt: number | null
}

/** Applies oldest customer cash and credit-note balances to a new invoice. */
export async function settleWithAvailableCredits(
  tx: TransactionClient,
  invoice: OpenInvoice,
  now: number
): Promise<void> {
  let amountDue = invoice.amountDue
  if (amountDue === 0n) return

  const payments = await tx.payment.findMany({
    where: {
      tenantId: invoice.tenantId,
      customerId: invoice.customerId,
      currency: invoice.currency,
      status: 'SUCCEEDED',
      unappliedAmount: { gt: 0n },
    },
    orderBy: [{ paymentDate: 'asc' }, { id: 'asc' }],
  })

  for (const payment of payments) {
    if (amountDue === 0n) break
    const currentInvoice = await tx.invoice.findUnique({
      where: { id: invoice.id },
      select: { amountDue: true, status: true, paidAt: true },
    })
    if (!currentInvoice)
      throw new Error('Invoice disappeared during settlement.')
    amountDue = currentInvoice.amountDue
    const amount =
      payment.unappliedAmount < amountDue ? payment.unappliedAmount : amountDue

    const updated = await tx.payment.updateMany({
      where: { id: payment.id, unappliedAmount: { gte: amount } },
      data: { unappliedAmount: { decrement: amount }, updatedAt: now },
    })
    if (updated.count !== 1) throw new Error('Payment credit changed.')

    const allocationId = generateId('PaymentAllocation')
    await tx.paymentAllocation.create({
      data: {
        id: allocationId,
        tenantId: invoice.tenantId,
        paymentId: payment.id,
        invoiceId: invoice.id,
        amount,
        invoiceStatusBefore: currentInvoice.status,
        invoicePaidAtBefore: currentInvoice.paidAt,
        createdAt: now,
        updatedAt: now,
      },
    })
    amountDue -= amount
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountDue,
        amountPaid: { increment: amount },
        status: amountDue === 0n ? 'PAID' : 'PARTIALLY_PAID',
        paidAt: amountDue === 0n ? now : null,
        updatedAt: now,
      },
    })
  }

  const creditNotes = await tx.creditNote.findMany({
    where: {
      tenantId: invoice.tenantId,
      customerId: invoice.customerId,
      currency: invoice.currency,
      status: 'OPEN',
      balanceAmount: { gt: 0n },
    },
    orderBy: [{ issueAt: 'asc' }, { id: 'asc' }],
  })

  for (const creditNote of creditNotes) {
    if (amountDue === 0n) break
    const currentInvoice = await tx.invoice.findUnique({
      where: { id: invoice.id },
      select: { amountDue: true, status: true, paidAt: true },
    })
    if (!currentInvoice)
      throw new Error('Invoice disappeared during settlement.')
    amountDue = currentInvoice.amountDue
    const amount =
      creditNote.balanceAmount < amountDue
        ? creditNote.balanceAmount
        : amountDue

    const updated = await tx.creditNote.updateMany({
      where: { id: creditNote.id, balanceAmount: { gte: amount } },
      data: {
        balanceAmount: { decrement: amount },
        status: creditNote.balanceAmount === amount ? 'CLOSED' : 'OPEN',
        updatedAt: now,
      },
    })
    if (updated.count !== 1) throw new Error('Credit-note balance changed.')

    const allocationId = generateId('CreditNoteAllocation')
    await tx.creditNoteAllocation.create({
      data: {
        id: allocationId,
        tenantId: invoice.tenantId,
        creditNoteId: creditNote.id,
        invoiceId: invoice.id,
        amount,
        invoiceStatusBefore: currentInvoice.status,
        invoicePaidAtBefore: currentInvoice.paidAt,
        createdAt: now,
        updatedAt: now,
      },
    })
    amountDue -= amount
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountDue,
        amountCredited: { increment: amount },
        status: amountDue === 0n ? 'PAID' : 'PARTIALLY_PAID',
        paidAt: amountDue === 0n ? now : null,
        updatedAt: now,
      },
    })
  }
}
