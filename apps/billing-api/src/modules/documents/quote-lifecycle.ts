import type { QuoteStatus } from './schemas/quote'

export type QuoteLifecycleAction =
  | 'send'
  | 'accept'
  | 'decline'
  | 'cancel'
  | 'expire'

export type QuoteLifecycleTimestampField =
  | 'sentAt'
  | 'acceptedAt'
  | 'declinedAt'
  | 'canceledAt'
  | 'expiredAt'

export interface QuoteLifecycleState {
  status: QuoteStatus
  expiresAt: number | null
}

export interface QuoteLifecycleTransition {
  to: QuoteStatus
  timestampField: QuoteLifecycleTimestampField
  preserveExistingTimestamp?: boolean
}

export function isQuoteExpired(
  quote: Pick<QuoteLifecycleState, 'expiresAt'>,
  asOf: number
) {
  return quote.expiresAt !== null && quote.expiresAt <= asOf
}

/**
 * Resolves an explicit quote command without mutating on read.
 *
 * `send` is repeatable while SENT so a resend can create fresh communication
 * evidence while preserving the first `sentAt`. Decision states remain
 * terminal. Expiry wins over acceptance/conversion once the configured time is
 * reached.
 */
export function resolveQuoteLifecycleTransition(
  quote: QuoteLifecycleState,
  action: QuoteLifecycleAction,
  asOf: number
): QuoteLifecycleTransition | null {
  if (action === 'expire') {
    if (
      (quote.status !== 'DRAFT' && quote.status !== 'SENT') ||
      !isQuoteExpired(quote, asOf)
    )
      return null

    return { to: 'EXPIRED', timestampField: 'expiredAt' }
  }

  if (action === 'accept' && isQuoteExpired(quote, asOf)) return null

  if (action === 'send') {
    if (quote.status !== 'DRAFT' && quote.status !== 'SENT') return null
    return {
      to: 'SENT',
      timestampField: 'sentAt',
      preserveExistingTimestamp: true,
    }
  }

  if (action === 'accept') {
    if (quote.status !== 'DRAFT' && quote.status !== 'SENT') return null
    return { to: 'ACCEPTED', timestampField: 'acceptedAt' }
  }

  if (action === 'decline') {
    return quote.status === 'SENT'
      ? { to: 'DECLINED', timestampField: 'declinedAt' }
      : null
  }

  if (action === 'cancel') {
    return quote.status === 'DRAFT' || quote.status === 'SENT'
      ? { to: 'CANCELED', timestampField: 'canceledAt' }
      : null
  }

  return null
}
