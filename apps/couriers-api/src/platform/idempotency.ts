import { createHash } from 'node:crypto'

/**
 * Stable hex digest for caller-supplied idempotency material.
 *
 * The caller passes an already-canonical string (fixed key order, string
 * values); this helper only digests it. There is no shared helper in
 * `@876/core`, and importing Billing's canonical-JSON hasher across the
 * service boundary is not permitted, so Couriers owns this digest.
 */
export function idempotencyHash(source: string): string {
  return createHash('sha256').update(source, 'utf8').digest('hex')
}
