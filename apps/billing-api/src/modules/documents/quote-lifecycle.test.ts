import { describe, expect, it } from 'vitest'

import {
  isQuoteExpired,
  resolveQuoteLifecycleTransition,
} from './quote-lifecycle'

const NOW = 1_800_000_000

describe('quote lifecycle', () => {
  it('recognizes the configured expiry boundary', () => {
    expect(isQuoteExpired({ expiresAt: NOW }, NOW)).toBe(true)
    expect(isQuoteExpired({ expiresAt: NOW + 1 }, NOW)).toBe(false)
    expect(isQuoteExpired({ expiresAt: null }, NOW)).toBe(false)
  })

  it('sends a draft and preserves first-send evidence on resend', () => {
    expect(
      resolveQuoteLifecycleTransition(
        { status: 'DRAFT', expiresAt: NOW + 10 },
        'send',
        NOW
      )
    ).toEqual({
      to: 'SENT',
      timestampField: 'sentAt',
      preserveExistingTimestamp: true,
    })
    expect(
      resolveQuoteLifecycleTransition(
        { status: 'SENT', expiresAt: NOW + 10 },
        'send',
        NOW
      )
    ).toEqual({
      to: 'SENT',
      timestampField: 'sentAt',
      preserveExistingTimestamp: true,
    })
  })

  it('supports manual acceptance from draft or sent', () => {
    for (const status of ['DRAFT', 'SENT'] as const) {
      expect(
        resolveQuoteLifecycleTransition(
          { status, expiresAt: NOW + 10 },
          'accept',
          NOW
        )
      ).toEqual({ to: 'ACCEPTED', timestampField: 'acceptedAt' })
    }
  })

  it('only allows decline from sent', () => {
    expect(
      resolveQuoteLifecycleTransition(
        { status: 'SENT', expiresAt: NOW + 10 },
        'decline',
        NOW
      )
    ).toEqual({ to: 'DECLINED', timestampField: 'declinedAt' })
    expect(
      resolveQuoteLifecycleTransition(
        { status: 'DRAFT', expiresAt: NOW + 10 },
        'decline',
        NOW
      )
    ).toBeNull()
  })

  it('expires draft and sent quotes only after expiresAt', () => {
    for (const status of ['DRAFT', 'SENT'] as const) {
      expect(
        resolveQuoteLifecycleTransition(
          { status, expiresAt: NOW },
          'expire',
          NOW
        )
      ).toEqual({ to: 'EXPIRED', timestampField: 'expiredAt' })
      expect(
        resolveQuoteLifecycleTransition(
          { status, expiresAt: NOW + 1 },
          'expire',
          NOW
        )
      ).toBeNull()
    }
  })

  it('gives expiry precedence over every other draft or sent command', () => {
    for (const status of ['DRAFT', 'SENT'] as const) {
      for (const action of ['send', 'accept', 'decline', 'cancel'] as const) {
        expect(
          resolveQuoteLifecycleTransition(
            { status, expiresAt: NOW },
            action,
            NOW
          )
        ).toBeNull()
      }
    }
  })

  it('keeps terminal decision states terminal', () => {
    for (const status of [
      'ACCEPTED',
      'DECLINED',
      'CANCELED',
      'EXPIRED',
    ] as const) {
      for (const action of [
        'send',
        'accept',
        'decline',
        'cancel',
        'expire',
      ] as const) {
        expect(
          resolveQuoteLifecycleTransition(
            { status, expiresAt: NOW - 10 },
            action,
            NOW
          )
        ).toBeNull()
      }
    }
  })
})
