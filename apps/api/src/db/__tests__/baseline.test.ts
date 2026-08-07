import { describe, expect, it } from 'vitest'

import { decideBaselineAction } from '../baseline'

const SAMPLE = [
  'users',
  'organizations',
  'memberships',
  'apps',
  'addresses',
  'features',
] as const

function decide(
  presentTables: readonly string[],
  baselineRow: Parameters<typeof decideBaselineAction>[0]['baselineRow'] = null
) {
  return decideBaselineAction({
    presentTables,
    sampleTables: SAMPLE,
    baselineRow,
  })
}

const APPLIED = { finishedAt: new Date('2026-08-07'), rolledBackAt: null }
const FAILED = { finishedAt: null, rolledBackAt: null }
const ROLLED_BACK = {
  finishedAt: new Date('2026-08-07'),
  rolledBackAt: new Date('2026-08-07'),
}

describe('decideBaselineAction', () => {
  it('does nothing when the baseline is already applied', () => {
    expect(decide([...SAMPLE], APPLIED)).toEqual({
      action: 'skip',
      reason: 'already-applied',
    })
  })

  it('does nothing on an empty database, so migrate deploy creates the schema', () => {
    expect(decide([])).toEqual({ action: 'skip', reason: 'empty-database' })
  })

  it('resolves the baseline on a pre-Prisma database carrying the full schema', () => {
    expect(decide([...SAMPLE])).toEqual({
      action: 'resolve',
      clearFailedRecord: false,
    })
  })

  it('ignores extra tables that are not part of the sample', () => {
    expect(decide([...SAMPLE, 'billing_customers', 'storage_files'])).toEqual({
      action: 'resolve',
      clearFailedRecord: false,
    })
  })

  it('clears a failed apply before resolving', () => {
    // This is the state the first failed deploy left behind: the row exists,
    // it never finished, and it was never rolled back.
    expect(decide([...SAMPLE], FAILED)).toEqual({
      action: 'resolve',
      clearFailedRecord: true,
    })
  })

  it('resolves again when a previously applied baseline was rolled back', () => {
    expect(decide([...SAMPLE], ROLLED_BACK)).toEqual({
      action: 'resolve',
      clearFailedRecord: false,
    })
  })

  it('refuses a partially-built schema rather than guessing', () => {
    // Marking the baseline applied here would permanently skip `features` and
    // `addresses`; applying it would fail on the tables that do exist.
    const decision = decide(['users', 'organizations', 'memberships', 'apps'])

    expect(decision.action).toBe('refuse')
    expect(decision).toEqual({
      action: 'refuse',
      missing: ['addresses', 'features'],
    })
  })

  it('refuses a schema missing only one table', () => {
    expect(decide(SAMPLE.filter((t) => t !== 'features'))).toEqual({
      action: 'refuse',
      missing: ['features'],
    })
  })

  it('does not treat a single present table as an empty database', () => {
    const decision = decide(['users'])

    expect(decision.action).toBe('refuse')
  })

  it('treats an empty database with a failed record as still empty', () => {
    // Nothing was created, so there is nothing to baseline — `migrate deploy`
    // must be allowed to build the schema from scratch.
    expect(decide([], FAILED)).toEqual({
      action: 'skip',
      reason: 'empty-database',
    })
  })
})
