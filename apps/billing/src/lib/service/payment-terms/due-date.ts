import type { PaymentTermRule } from '@/lib/db'

interface PaymentTermValue {
  rule: PaymentTermRule
  dueDays: number
}

/** Resolves an invoice due date from a payment term in UTC. */
export function resolveDueAt(issueAt: number, term: PaymentTermValue): number {
  if (term.rule === 'DUE_ON_RECEIPT') return issueAt
  if (term.rule === 'NET_DAYS') return issueAt + term.dueDays * 86_400

  const issued = new Date(issueAt * 1000)
  const year = issued.getUTCFullYear()
  const month = issued.getUTCMonth()
  const endMonth = term.rule === 'END_OF_NEXT_MONTH' ? month + 2 : month + 1

  return Math.floor(Date.UTC(year, endMonth, 0, 23, 59, 59) / 1000)
}
