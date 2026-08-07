/**
 * Ported from the behaviour of `core/deletion.py`.
 *
 * The mode is a production safety switch: `hard` in development so test data can
 * be reset, `soft` in production so nothing user-facing is physically removed.
 * Both directions are asserted, because a helper that reported `soft`
 * unconditionally would pass a happy-path-only suite while making every
 * development reset impossible.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { resetSettingsForTest } from '@/config'

import { deletionValues, shouldSoftDelete } from '../deletion'

function withDeletionMode(mode: string | undefined): void {
  resetSettingsForTest({ ...process.env, DELETION_MODE: mode })
}

afterEach(() => {
  resetSettingsForTest()
  vi.useRealTimers()
})

describe('shouldSoftDelete', () => {
  it('is true when the mode is soft', () => {
    withDeletionMode('soft')

    expect(shouldSoftDelete()).toBe(true)
  })

  it.each([
    ['SOFT', true],
    ['Soft', true],
    ['  soft  ', true],
  ])('accepts %s as soft', (mode, expected) => {
    withDeletionMode(mode)

    expect(shouldSoftDelete()).toBe(expected)
  })

  it.each([
    ['hard', 'the documented hard value'],
    ['', 'an empty value'],
    ['softly', 'a value that merely starts with soft'],
    ['none', 'an unrecognised value'],
  ])('is false for %s (%s)', (mode) => {
    withDeletionMode(mode)

    expect(shouldSoftDelete()).toBe(false)
  })

  it('defaults to hard when the variable is unset', () => {
    // The config schema defaults DELETION_MODE to 'hard', so an unset variable
    // must not be read as soft.
    withDeletionMode(undefined)

    expect(shouldSoftDelete()).toBe(false)
  })
})

describe('deletionValues', () => {
  it('stamps the tombstone columns with the current Unix second', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-07T03:00:00Z'))
    const expected = BigInt(
      Math.floor(Date.parse('2026-08-07T03:00:00Z') / 1000)
    )

    expect(deletionValues('user_123', 'duplicate record')).toEqual({
      deletedAt: expected,
      deletedBy: 'user_123',
      deletionReason: 'duplicate record',
      updatedAt: expected,
    })
  })

  it('defaults the actor and the reason to null', () => {
    const values = deletionValues()

    expect(values.deletedBy).toBeNull()
    expect(values.deletionReason).toBeNull()
  })

  it('moves updatedAt with the deletion', () => {
    // A tombstone is a modification of the row: a list ordered by updated_at
    // would otherwise show a just-deleted record as untouched.
    const values = deletionValues()

    expect(values.updatedAt).toBe(values.deletedAt)
  })

  it('returns BigInt timestamps, as the BigInt columns require', () => {
    const values = deletionValues()

    expect(typeof values.deletedAt).toBe('bigint')
    expect(typeof values.updatedAt).toBe('bigint')
  })
})
