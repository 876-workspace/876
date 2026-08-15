/**
 * Predicate helpers for admin resource types.
 *
 * Use these instead of accessing snake_case fields directly on the frontend.
 * They encode the correct comparison semantics (Unix seconds, nullable checks).
 */

import { nowUnixSeconds } from '@876/core/timestamps'

export function isExpired(item: { expiresAt: number | null }): boolean {
  return item.expires_at !== null && item.expires_at < nowUnixSeconds()
}

export function isDefault(item: { isDefault: boolean }): boolean {
  return item.is_default
}

export function isDeleted(item: { deletedAt: number | null }): boolean {
  return item.deleted_at !== null
}

export function isRevoked(item: { revoked: boolean }): boolean {
  return item.revoked
}
