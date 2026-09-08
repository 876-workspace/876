import type { InvoiceStatus } from '@/db'

export const collectibleInvoiceStatuses = [
  'OPEN',
  'SENT',
  'PARTIALLY_PAID',
  'OVERDUE',
] as const satisfies readonly InvoiceStatus[]

export const overdueCandidateInvoiceStatuses = [
  'OPEN',
  'SENT',
  'PARTIALLY_PAID',
] as const satisfies readonly InvoiceStatus[]

const collectibleInvoiceStatusSet = new Set<InvoiceStatus>(
  collectibleInvoiceStatuses
)

export interface InvoiceLifecycleProjection {
  amountDue: bigint
  amountPaid: bigint
  amountCredited: bigint
  dueAt: number | null
  sentAt: number | null
  asOf: number
}

export function isCollectibleInvoiceStatus(status: InvoiceStatus): boolean {
  return collectibleInvoiceStatusSet.has(status)
}

export function projectCollectibleInvoiceStatus({
  amountDue,
  amountPaid,
  amountCredited,
  dueAt,
  sentAt,
  asOf,
}: InvoiceLifecycleProjection): InvoiceStatus {
  if (amountDue === 0n) return 'PAID'
  if (dueAt !== null && dueAt < asOf) return 'OVERDUE'
  if (amountPaid > 0n || amountCredited > 0n) return 'PARTIALLY_PAID'
  if (sentAt !== null) return 'SENT'

  return 'OPEN'
}
