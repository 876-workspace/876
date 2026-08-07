import { describe, expect, it } from 'vitest'

import { decideBaselineAction } from '../baseline'

const SAMPLE = [
  'users',
  'organizations',
  'memberships',
  'apps',
  'features',
  'user_identifications',
] as const

function decide(
  presentTables: readonly string[],
  baselineRow: Parameters<typeof decideBaselineAction>[0]['baselineRow'] = null,
  publicTableCount = presentTables.length
) {
  return decideBaselineAction({
    presentTables,
    sampleTables: SAMPLE,
    publicTableCount,
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
    expect(decide([], null, 0)).toEqual({
      action: 'skip',
      reason: 'empty-database',
    })
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
    // `user_identifications`; applying it would fail on the tables that exist.
    expect(decide(['users', 'organizations', 'memberships', 'apps'])).toEqual({
      action: 'refuse',
      reason: 'partial-schema',
      missing: ['features', 'user_identifications'],
    })
  })

  it('refuses a schema missing only one table', () => {
    expect(decide(SAMPLE.filter((table) => table !== 'features'))).toEqual({
      action: 'refuse',
      reason: 'partial-schema',
      missing: ['features'],
    })
  })

  it('does not treat a single present table as an empty database', () => {
    expect(decide(['users']).action).toBe('refuse')
  })

  it('treats an empty database with a failed record as still empty', () => {
    // Nothing was created, so there is nothing to baseline — `migrate deploy`
    // must be allowed to build the schema from scratch.
    expect(decide([], FAILED, 0)).toEqual({
      action: 'skip',
      reason: 'empty-database',
    })
  })

  it('refuses a populated database holding none of the identity tables', () => {
    // The couriers database, which the deploy was pointed at for a day: 28
    // tables, not one of them an identity table.
    expect(decide([], null, 28)).toEqual({
      action: 'refuse',
      reason: 'foreign-database',
      missing: [...SAMPLE],
    })
  })

  it('refuses a foreign database even when it carries an applied baseline row', () => {
    // A stray row from an earlier misaimed run must not be read as consent to
    // keep writing to the wrong database.
    expect(decide([], APPLIED, 28)).toEqual({
      action: 'refuse',
      reason: 'foreign-database',
      missing: [...SAMPLE],
    })
  })

  it('does not mistake a shared table name for the identity schema', () => {
    // `addresses` exists in couriers too, which is why it is no longer sampled:
    // it is invisible here, so a courier database still reads as foreign.
    expect(decide([], null, 28).action).toBe('refuse')
  })
})
