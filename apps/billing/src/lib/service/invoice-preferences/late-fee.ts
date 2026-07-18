import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { ServiceResult } from '@/types/api'

import { recomputeCustomerAr } from '../customers/ar'
import { nextDocumentNumber } from '../documents/numbers'
import { markOverdue } from '../invoices/mark-overdue'
import { recordLedgerEntry } from '../ledger'
import { err, ok } from '../result'
import { isUniqueConstraintError } from '../shared'

const DAY_SECONDS = 86_400
const PERCENT_SCALE = 1_000_000n
const MAX_ASSESSMENTS_PER_RUN = 500

interface LateFeePolicy {
  lateFeeCalculationType: 'PERCENTAGE' | 'FIXED'
  lateFeePercent: { toString(): string } | number | string | null
  lateFeeAmount: bigint | null
}

/** Calculates a minor-unit late fee with deterministic half-up rounding. */
export function calculateLateFee(
  amountDue: bigint,
  policy: LateFeePolicy
): bigint {
  if (amountDue <= 0n) return 0n
  if (policy.lateFeeCalculationType === 'FIXED')
    return policy.lateFeeAmount ?? 0n

  const scaledPercent = parseScaledPercent(policy.lateFeePercent)
  if (scaledPercent <= 0n) return 0n

  return (amountDue * scaledPercent + PERCENT_SCALE / 2n) / PERCENT_SCALE
}

/** Creates at most one late-fee invoice for each eligible overdue invoice. */
export async function assessLateFees(
  tenantId: string,
  asOf = nowUnixSeconds()
): ServiceResult<{ created: number; skipped: number; hasMore: boolean }> {
  const preference = await prisma.invoicePreference.findUnique({
    where: { tenantId },
  })
  if (!preference) return err('Invoice preferences were not found.', 404)
  if (!preference.lateFeesEnabled)
    return ok({ created: 0, skipped: 0, hasMore: false })

  await markOverdue(tenantId, asOf)

  const candidates = await prisma.invoice.findMany({
    where: {
      tenantId,
      billingReason: { not: 'LATE_FEE' },
      dueAt: {
        not: null,
        lte: asOf - preference.lateFeeGraceDays * DAY_SECONDS,
      },
      amountDue: { gt: 0n },
      status: 'OVERDUE',
      lateFeeAssessments: { none: {} },
      customer: { lateFeeExempt: false },
    },
    orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
    take: MAX_ASSESSMENTS_PER_RUN + 1,
  })
  const hasMore = candidates.length > MAX_ASSESSMENTS_PER_RUN

  let created = 0
  let skipped = 0
  for (const invoice of candidates.slice(0, MAX_ASSESSMENTS_PER_RUN)) {
    try {
      const wasCreated = await prisma.$transaction(async (tx) => {
        const source = await tx.invoice.findFirst({
          where: {
            id: invoice.id,
            tenantId,
            amountDue: { gt: 0n },
            status: 'OVERDUE',
            lateFeeAssessments: { none: {} },
            customer: { lateFeeExempt: false },
          },
        })
        if (!source) return false

        const amount = calculateLateFee(source.amountDue, preference)
        if (amount <= 0n) return false

        const number = await nextDocumentNumber(tenantId, 'INVOICE', asOf, tx)
        const status = preference.lateFeeGenerateAsDraft ? 'DRAFT' : 'OPEN'
        const lateFeeInvoice = await tx.invoice.create({
          data: {
            id: generateId('Invoice'),
            tenantId,
            customerId: source.customerId,
            number,
            status,
            billingReason: 'LATE_FEE',
            currency: source.currency,
            issueAt: asOf,
            dueAt: asOf,
            finalizedAt: status === 'OPEN' ? asOf : null,
            taxBehavior: 'EXCLUSIVE',
            customerName: source.customerName,
            customerEmail: source.customerEmail,
            billingAddressSnapshot: source.billingAddressSnapshot ?? undefined,
            shippingAddressSnapshot:
              source.shippingAddressSnapshot ?? undefined,
            subtotalAmount: amount,
            taxAmount: 0n,
            totalAmount: amount,
            amountDue: amount,
            notes: `Late fee for invoice ${source.number}`,
            createdAt: asOf,
            updatedAt: asOf,
            lines: {
              create: {
                id: generateId('InvoiceLine'),
                description: `Late fee for invoice ${source.number}`,
                position: 0,
                quantity: 1,
                unitAmount: amount,
                totalAmount: amount,
                createdAt: asOf,
                updatedAt: asOf,
              },
            },
          },
        })

        await tx.lateFeeAssessment.create({
          data: {
            id: generateId('LateFeeAssessment'),
            tenantId,
            sourceInvoiceId: source.id,
            lateFeeInvoiceId: lateFeeInvoice.id,
            calculationType: preference.lateFeeCalculationType,
            baseAmount: source.amountDue,
            percent:
              preference.lateFeeCalculationType === 'PERCENTAGE'
                ? preference.lateFeePercent
                : null,
            fixedAmount:
              preference.lateFeeCalculationType === 'FIXED'
                ? preference.lateFeeAmount
                : null,
            assessedAmount: amount,
            graceDays: preference.lateFeeGraceDays,
            assessedAt: asOf,
            createdAt: asOf,
          },
        })

        if (status === 'OPEN') {
          await recordLedgerEntry(tx, {
            tenantId,
            customerId: source.customerId,
            invoiceId: lateFeeInvoice.id,
            type: 'INVOICE_FINALIZED',
            direction: 'DEBIT',
            amount,
            currency: source.currency,
            description: `Late fee for invoice ${source.number}`,
            idempotencyKey: `invoice:${source.id}:late-fee`,
            effectiveAt: asOf,
            createdAt: asOf,
          })
          await recomputeCustomerAr(tx, tenantId, source.customerId, asOf)
        }

        return true
      })
      if (wasCreated) created += 1
      else skipped += 1
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        skipped += 1
        continue
      }

      console.error(
        '[billing.service.invoice-preferences.assess-late-fees]',
        error
      )
      return err('Failed to assess late fees.', 500)
    }
  }

  return ok({ created, skipped, hasMore })
}

function parseScaledPercent(value: LateFeePolicy['lateFeePercent']): bigint {
  if (value === null) return 0n

  const normalized = value.toString().trim()
  const match = /^(\d{1,3})(?:\.(\d{1,4}))?$/.exec(normalized)
  if (!match) return 0n

  const whole = BigInt(match[1] ?? '0')
  const fraction = BigInt((match[2] ?? '').padEnd(4, '0'))
  return whole * 10_000n + fraction
}
