import {
  generateDueRecurringInvoice,
  markOverdueAcrossActiveTenants,
  recordRecurringInvoiceFailure,
} from '@/modules/documents'
import { prisma } from '@/db/client'
import { Prisma } from '@/db/generated/prisma/client'
import { generateId } from '@/platform/ids'

import { billSubscription, recordBillingFailure } from '@/modules/subscriptions'
import { processDueLifecycleSchedulesAcrossTenants } from '@/modules/subscriptions'
import type {
  BillingSweepParams,
  BillingSweepResult,
} from '@/modules/subscriptions'

type DueSubscription = {
  id: string
  tenantId: string
  advance: boolean
}

type DueRecurringInvoice = { id: string; tenantId: string }

export type BillingEngineRun = Omit<BillingSweepResult, 'object'> & {
  id: string
  object: 'billing_engine_run'
  recurringInvoices: {
    processed: number
    succeeded: number
    failed: number
    skipped: number
  }
}

/**
 * Claims and bills one row per transaction. The row lock and the financial
 * writes share the same transaction, so concurrent workers skip a claimed
 * subscription instead of waiting and producing a second invoice.
 */
export async function runBillingSweep(
  params: BillingSweepParams & { timeBudgetMs?: number }
): Promise<BillingEngineRun> {
  const asOf = params.asOf ?? Math.floor(Date.now() / 1_000)
  const limit = params.limit ?? 25
  const timeBudgetMs = params.timeBudgetMs ?? 240_000
  const handled: string[] = []
  const summary: BillingEngineRun = {
    object: 'billing_engine_run',
    id: generateId('SubscriptionBillingRun'),
    asOf,
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    hasMore: false,
    invoiceIds: [],
    recurringInvoices: { processed: 0, succeeded: 0, failed: 0, skipped: 0 },
  }
  const startedAt = Date.now()

  while (summary.processed < limit && Date.now() - startedAt < timeBudgetMs) {
    let claimed: DueSubscription | null = null
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const excluded =
            handled.length === 0
              ? Prisma.empty
              : Prisma.sql`AND s.id NOT IN (${Prisma.join(handled)})`
          const rows = await tx.$queryRaw<DueSubscription[]>(Prisma.sql`
            SELECT
              s.id,
              s.tenant_id AS "tenantId",
              (s.next_billing_at > ${asOf}) AS advance
            FROM billing_subscriptions AS s
            INNER JOIN billing_tenants AS t ON t.id = s.tenant_id
            LEFT JOIN billing_subscription_preferences AS p
              ON p.tenant_id = s.tenant_id
            WHERE t.status = 'ACTIVE'
              AND s.deleted_at IS NULL
              AND s.status IN ('TRIALING', 'ACTIVE')
              AND s.next_billing_at IS NOT NULL
              AND (
                s.next_billing_at <= ${asOf}
                OR (
                  COALESCE(p.automate_advance_billing, FALSE) = TRUE
                  AND COALESCE(p.advance_billing_method::text, 'INVOICE') = 'INVOICE'
                  AND COALESCE(
                    s.advance_billing_enabled,
                    p.advance_billing_enabled,
                    FALSE
                  ) = TRUE
                  AND s.next_advance_invoice_at IS NOT NULL
                  AND s.next_advance_invoice_at <= ${asOf}
                  AND s.next_billing_at > ${asOf}
                  AND s.cancel_at_period_end = FALSE
                )
              )
              ${excluded}
            ORDER BY s.next_billing_at, s.id
            LIMIT 1
            FOR UPDATE OF s SKIP LOCKED
          `)
          const row = rows[0]
          if (!row) return null
          claimed = row

          return billSubscription(row.tenantId, row.id, asOf, {
            advance: row.advance,
            transaction: tx,
          })
        },
        { isolationLevel: 'Serializable' }
      )
      const processed = claimed as DueSubscription | null
      if (!processed) break

      handled.push(processed.id)
      summary.processed += 1
      if (result?.status === 'skipped') summary.skipped += 1
      else summary.succeeded += 1
      if (result?.invoiceId && !summary.invoiceIds.includes(result.invoiceId))
        summary.invoiceIds.push(result.invoiceId)
    } catch (error) {
      const failed = claimed as DueSubscription | null
      if (!failed) throw error

      handled.push(failed.id)
      summary.processed += 1
      summary.failed += 1
      await recordBillingFailure(failed.tenantId, failed.id, asOf, error)
    }
  }

  // A profile whose run failed keeps its nextRunAt, so without this list the
  // loop would re-claim it until the time budget ran out.
  const handledRecurring: string[] = []
  while (summary.processed < limit && Date.now() - startedAt < timeBudgetMs) {
    let claimed: DueRecurringInvoice | null = null
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const rows = await tx.$queryRaw<DueRecurringInvoice[]>(Prisma.sql`
          SELECT r.id, r.tenant_id AS "tenantId"
          FROM billing_recurring_invoices AS r
          INNER JOIN billing_tenants AS t ON t.id = r.tenant_id
          WHERE t.status = 'ACTIVE' AND r.deleted_at IS NULL
            AND r.status = 'ACTIVE' AND r.next_run_at IS NOT NULL
            AND r.next_run_at <= ${asOf}
            ${
              handledRecurring.length === 0
                ? Prisma.empty
                : Prisma.sql`AND r.id NOT IN (${Prisma.join(handledRecurring)})`
            }
          ORDER BY r.next_run_at, r.id LIMIT 1 FOR UPDATE OF r SKIP LOCKED
        `)
          const row = rows[0]
          if (!row) return null
          claimed = row
          return generateDueRecurringInvoice(row.tenantId, row.id, asOf, {
            transaction: tx,
          })
        },
        { isolationLevel: 'Serializable' }
      )
      const processed = claimed as DueRecurringInvoice | null
      if (!processed) break
      handledRecurring.push(processed.id)
      summary.processed += 1
      summary.recurringInvoices.processed += 1
      if (result?.status === 'succeeded') {
        summary.succeeded += 1
        summary.recurringInvoices.succeeded += 1
        if (result.invoiceId) summary.invoiceIds.push(result.invoiceId)
      } else if (result?.status === 'failed') {
        summary.failed += 1
        summary.recurringInvoices.failed += 1
      } else {
        summary.skipped += 1
        summary.recurringInvoices.skipped += 1
      }
    } catch (error) {
      const failed = claimed as DueRecurringInvoice | null
      if (!failed) throw error
      handledRecurring.push(failed.id)
      summary.processed += 1
      summary.failed += 1
      summary.recurringInvoices.processed += 1
      summary.recurringInvoices.failed += 1
      await recordRecurringInvoiceFailure(
        failed.tenantId,
        failed.id,
        asOf,
        error
      )
    }
  }

  await processDueLifecycleSchedulesAcrossTenants(asOf)
  await markOverdueAcrossActiveTenants(asOf)
  summary.hasMore =
    summary.processed === limit || Date.now() - startedAt >= timeBudgetMs

  return summary
}
