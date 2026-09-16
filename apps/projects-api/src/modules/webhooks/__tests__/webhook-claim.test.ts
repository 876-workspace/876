import { describe, expect, it } from 'vitest'

import { buildClaimDueDeliveriesQuery } from '../webhooks.repository.js'

describe('claim due deliveries query', () => {
  it('claims atomically with skip locked', () => {
    const query = buildClaimDueDeliveriesQuery(2000n, 25)
    expect(query.sql).toContain('FOR UPDATE SKIP LOCKED')
  })

  it('marks claimed rows delivering', () => {
    const query = buildClaimDueDeliveriesQuery(2000n, 25)
    expect(query.sql).toContain("SET \"status\" = 'delivering'")
  })

  it('recovers stale delivering rows after three hundred seconds', () => {
    const query = buildClaimDueDeliveriesQuery(2000n, 25)
    expect(query.sql).toContain("\"status\" = 'delivering'")
    expect(query.sql).toContain('- 300')
  })

  it('only claims pending or scheduled rows under the attempt budget', () => {
    const query = buildClaimDueDeliveriesQuery(2000n, 25)
    expect(query.sql).toContain("'pending', 'scheduled'")
    expect(query.sql).toContain('"attempt" < 8')
  })

  it('respects next attempt backoff and ordering', () => {
    const query = buildClaimDueDeliveriesQuery(2000n, 25)
    expect(query.sql).toContain('"next_attempt_at" IS NULL')
    expect(query.sql).toContain('ORDER BY "created_at" ASC')
  })

  it('returns the claimed rows', () => {
    const query = buildClaimDueDeliveriesQuery(2000n, 25)
    expect(query.sql).toContain('RETURNING')
  })
})
