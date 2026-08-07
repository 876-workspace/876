/**
 * Deletion policy helpers.
 *
 * Development defaults to hard deletes so test data can be reset quickly.
 * Production should run with `DELETION_MODE=soft` so user-facing reads can hide
 * tombstoned rows while Console can still render deleted records with clear
 * status indicators (`.claude/rules/deletions.md`).
 *
 * Ported from `core/deletion.py`. The mode is read per call rather than
 * captured at module load, because the test suite flips it between cases and a
 * cached value would make the second case assert the first one's policy.
 */

import { getSettings } from '@/config'
import { nowUnixSeconds } from '@/platform/timestamps'

/** Whether a delete should tombstone the row instead of removing it. */
export function shouldSoftDelete(): boolean {
  return getSettings().deletionMode.trim().toLowerCase() === 'soft'
}

/**
 * The tombstone columns to write when soft-deleting.
 *
 * `updatedAt` moves with the deletion because a tombstone is a modification of
 * the row — a list ordered by `updated_at` would otherwise show a just-deleted
 * record as untouched.
 */
export function deletionValues(
  deletedBy: string | null = null,
  reason: string | null = null
): {
  deletedAt: bigint
  deletedBy: string | null
  deletionReason: string | null
  updatedAt: bigint
} {
  const now = BigInt(nowUnixSeconds())

  return {
    deletedAt: now,
    deletedBy,
    deletionReason: reason,
    updatedAt: now,
  }
}
