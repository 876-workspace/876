/**
 * Query helpers shared by the three directory resource groups.
 *
 * Every group needs the same tombstone predicate and the same nested-address
 * write, so they live here rather than being repeated three times — a second
 * copy of the `include_deleted` predicate is exactly how one of them would
 * eventually stop filtering.
 */

import { generateId } from '@/platform/ids'

import type {
  DirectoryAddressCreate,
  DirectoryAddressUpdate,
} from './directory.schemas'

/** `deleted_at IS NULL` unless the caller is allowed to see tombstones. */
export function liveOnly(
  includeDeleted: boolean
): { deletedAt: null } | object {
  return includeDeleted ? {} : { deletedAt: null }
}

/**
 * A case-insensitive `name LIKE %search%` clause, or nothing.
 *
 * Matches the Python's `Model.name.ilike(f"%{search}%")`.
 */
export function nameSearch(search: string | undefined): object {
  return search
    ? { name: { contains: search, mode: 'insensitive' as const } }
    : {}
}

export function addressCreateData(input: DirectoryAddressCreate, now: bigint) {
  return {
    id: generateId('directoryAddress'),
    line1: input.line1,
    line2: input.line2 ?? null,
    city: input.city,
    state: input.state,
    postalCode: input.postal_code ?? null,
    country: input.country,
    latitude: input.latitude,
    longitude: input.longitude,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Only the address fields that were actually sent.
 *
 * `line2` and `postal_code` are checked against `undefined` rather than `null`,
 * because both are nullable and an explicit `null` is a real instruction to
 * clear them — collapsing the two would make a field impossible to unset.
 */
export function addressUpdateData(input: DirectoryAddressUpdate, now: bigint) {
  const data: Record<string, unknown> = { updatedAt: now }

  if (input.line1 != null) data['line1'] = input.line1
  if (input.line2 !== undefined) data['line2'] = input.line2
  if (input.city != null) data['city'] = input.city
  if (input.state != null) data['state'] = input.state
  if (input.postal_code !== undefined) data['postalCode'] = input.postal_code
  if (input.country != null) data['country'] = input.country
  if (input.latitude != null) data['latitude'] = input.latitude
  if (input.longitude != null) data['longitude'] = input.longitude

  return data
}

/** Rename the wire's snake_case keys to their Prisma client equivalents. */
export function renameKeys(
  data: Record<string, unknown>,
  map: Record<string, string>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [map[key] ?? key, value])
  )
}
