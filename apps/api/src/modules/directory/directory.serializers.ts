/**
 * Row → API resource for the shared nested address.
 *
 * The serializer is where the database's camelCase client names meet the wire's
 * snake_case contract, and where the `object` discriminator is stamped. Row
 * types are declared structurally here rather than imported from
 * `@prisma/client`, matching every other module: the repository's `select`
 * decides the shape, and a hand-written type keeps a Prisma field name from
 * leaking into a response by accident.
 */

import { fromDbUnixSeconds } from '@/platform/timestamps'

import type { DirectoryAddress } from './directory.schemas'

export type DirectoryAddressRow = {
  id: string
  line1: string
  line2: string | null
  city: string
  state: string
  postalCode: string | null
  country: string
  latitude: number
  longitude: number
  createdAt: bigint
  updatedAt: bigint
}

export const DIRECTORY_ADDRESS_SELECT = {
  id: true,
  line1: true,
  line2: true,
  city: true,
  state: true,
  postalCode: true,
  country: true,
  latitude: true,
  longitude: true,
  createdAt: true,
  updatedAt: true,
} as const

export function serializeDirectoryAddress(
  row: DirectoryAddressRow
): DirectoryAddress {
  return {
    object: 'directory_address',
    id: row.id,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    state: row.state,
    postal_code: row.postalCode,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
