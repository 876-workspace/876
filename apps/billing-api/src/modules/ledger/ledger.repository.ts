import type { LedgerDirection, LedgerEntryType, Prisma } from '@/db'
import { generateId } from '@/platform/ids'

type TransactionClient = Prisma.TransactionClient
type LedgerEntryParams = {
  tenantId: string
  customerId: string
  subscriptionId?: string | null
  invoiceId?: string | null
  paymentId?: string | null
  creditNoteId?: string | null
  refundId?: string | null
  type: LedgerEntryType
  direction: LedgerDirection
  amount: bigint
  currency: string
  description?: string | null
  idempotencyKey: string
  effectiveAt: number
  createdAt: number
}
export async function recordLedgerEntry(
  tx: TransactionClient,
  params: LedgerEntryParams
): Promise<void> {
  if (params.amount <= 0n) return
  await tx.customerLedgerEntry.upsert({
    where: {
      tenantId_idempotencyKey: {
        tenantId: params.tenantId,
        idempotencyKey: params.idempotencyKey,
      },
    },
    create: {
      id: generateId('CustomerLedgerEntry'),
      tenantId: params.tenantId,
      customerId: params.customerId,
      subscriptionId: params.subscriptionId ?? null,
      invoiceId: params.invoiceId ?? null,
      paymentId: params.paymentId ?? null,
      creditNoteId: params.creditNoteId ?? null,
      refundId: params.refundId ?? null,
      type: params.type,
      direction: params.direction,
      amount: params.amount,
      currency: params.currency,
      description: params.description ?? null,
      idempotencyKey: params.idempotencyKey,
      effectiveAt: params.effectiveAt,
      createdAt: params.createdAt,
    },
    update: {},
  })
}
