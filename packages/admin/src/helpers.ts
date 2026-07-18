/**
 * Predicate helpers for admin resource types.
 *
 * Use these instead of accessing snake_case fields directly on the frontend.
 * They encode the correct comparison semantics (Unix seconds, nullable checks).
 */

import { nowUnixSeconds } from '@876/core/timestamps'

export function isExpired(item: { expires_at: number | null }): boolean {
  return item.expires_at !== null && item.expires_at < nowUnixSeconds()
}

export function isDefault(item: { is_default: boolean }): boolean {
  return item.is_default
}

export function isDeleted(item: { deleted_at: number | null }): boolean {
  return item.deleted_at !== null
}

export function isRevoked(item: { revoked: boolean }): boolean {
  return item.revoked
}
