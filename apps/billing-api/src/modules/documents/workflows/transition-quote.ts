import { nowUnixSeconds } from '@876/core/timestamps'

import {
  claimCommand,
  completeCommand,
} from '@/modules/command-idempotency'
import { enqueueBillingEvent } from '@/modules/outbox'
import { isRetryableTransactionError } from '@/platform/prisma-errors'
import type { IdempotencyContext } from '@/types/commerce'

import {
  resolveQuoteLifecycleTransition,
  type QuoteLifecycleAction,
} from '../quote-lifecycle'
import {
  applyQuoteLifecycleTransition,
  findQuoteForLifecycle,
  runQuoteTransaction,
} from '../repositories/quote-workflow'
import { err, ok } from '../repositories/result'
import type { ServiceResult } from '../schemas/api'
import type { QuoteStatus } from '../schemas/quote'

const eventTypeByAction = {
  send: 'quote.sent',
  accept: 'quote.accepted',
  decline: 'quote.declined',
  cancel: 'quote.canceled',
  expire: 'quote.expired',
} as const

const terminalStatusByAction: Partial<
  Record<QuoteLifecycleAction, QuoteStatus>
> = {
  accept: 'ACCEPTED',
  decline: 'DECLINED',
  cancel: 'CANCELED',
  expire: 'EXPIRED',
}

/**
 * Executes one quote lifecycle command with compare-and-set persistence,
 * transactional outbox evidence, and optional command idempotency.
 *
 * Retrying a terminal decision after it has already landed is a semantic
 * replay. Sending is intentionally different: sending an already-SENT quote
 * records a fresh communication event while preserving the first sentAt.
 */
export async function transitionQuoteWorkflow(
  tenantId: string,
  quoteId: string,
  action: QuoteLifecycleAction,
  idempotency?: IdempotencyContext
): ServiceResult<{ id: string }> {
  const now = nowUnixSeconds()

  try {
    return await runQuoteTransaction(async (tx) => {
      let claimId: string | undefined
      if (idempotency) {
        const claim = await claimCommand(tx, tenantId, {
          operation: `quote-${action}`,
          key: idempotency.key,
          requestHash: idempotency.requestHash,
          resource: { type: 'quote', id: quoteId },
          httpStatus: 200,
          now,
        })
        if (claim.error !== null)
          return err(claim.error, claim.status, claim.code)
        if (claim.data.state === 'replayed') return ok({ id: quoteId })
        claimId = claim.data.claimId
      }

      const quote = await findQuoteForLifecycle(tx, tenantId, quoteId)
      if (!quote) return err('Quote not found.', 404)

      if (terminalStatusByAction[action] === quote.status) {
        if (claimId) await completeCommand(tx, tenantId, claimId, now)
        return ok({ id: quoteId })
      }

      const transition = resolveQuoteLifecycleTransition(
        { status: quote.status, expiresAt: quote.expiresAt },
        action,
        now
      )
      if (!transition)
        return err(
          'This quote cannot be changed from its current status.',
          409,
          'billing/quote-invalid-state'
        )

      const changed = await applyQuoteLifecycleTransition(tx, {
        tenantId,
        quoteId,
        from: quote.status,
        transition,
        existingSentAt: quote.sentAt,
        now,
      })
      if (!changed)
        return err(
          'This quote cannot be changed from its current status.',
          409,
          'billing/quote-invalid-state'
        )

      await enqueueBillingEvent(tx, tenantId, {
        type: eventTypeByAction[action],
        version: 1,
        resource: { type: 'quote', id: quote.id },
        payload: {
          quoteId: quote.id,
          customerId: quote.customerId,
          number: quote.number,
          currency: quote.currency,
          status: transition.to,
          occurredAt: now,
        },
        occurredAt: now,
      })

      if (claimId) await completeCommand(tx, tenantId, claimId, now)
      return ok({ id: quoteId })
    })
  } catch (error) {
    if (isRetryableTransactionError(error))
      return err('The quote changed while this command was running; retry.', 409)

    console.error('[billing.workflow.quotes.transition]', error)
    return err('Failed to update the quote.', 500)
  }
}
