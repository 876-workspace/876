import { describe, expect, it } from 'vitest'

import {
  buildClaimEventsQuery,
  computeRetryDelaySeconds,
  MAX_EVENT_ATTEMPTS,
} from '../automation.repository.js'

describe('claim events query', () => {
  it('claims with FOR UPDATE SKIP LOCKED', () => {
    const query = buildClaimEventsQuery(1000n, 25)

    expect(query.sql).toContain('FOR UPDATE SKIP LOCKED')
  })

  it('only claims pending events whose backoff has elapsed', () => {
    const query = buildClaimEventsQuery(1000n, 25)

    expect(query.sql).toContain('"processed_at" IS NULL')
    expect(query.sql).toContain('"next_attempt_at" IS NULL')
    expect(query.sql).toContain('ORDER BY "created_at" ASC')
  })

  it('caps attempts at the configured maximum', () => {
    expect(MAX_EVENT_ATTEMPTS).toBe(5)
    const query = buildClaimEventsQuery(1000n, 25)

    expect(query.sql).toContain('"attempts" <')
  })
})

describe('retry backoff', () => {
  it('starts at thirty seconds and doubles', () => {
    expect(computeRetryDelaySeconds(1)).toBe(30)
    expect(computeRetryDelaySeconds(2)).toBe(60)
    expect(computeRetryDelaySeconds(3)).toBe(120)
    expect(computeRetryDelaySeconds(4)).toBe(240)
  })

  it('caps the delay at one hour', () => {
    expect(computeRetryDelaySeconds(10)).toBe(3600)
  })
})
