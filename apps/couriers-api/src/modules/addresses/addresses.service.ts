import { AppHttpError } from '@/platform/errors'
import { nowUnixSeconds } from '@/platform/timestamps'
import { resolveRegion } from '@/providers/platform/geo'

import * as repo from './addresses.repository'
import { serializeAddress, type AddressRow } from './addresses.serializers'
import type {
  Address,
  AddressCreateBody,
  AddressUpdateBody,
  ListAddressesQuery,
} from './addresses.schemas'

const notFound = () =>
  new AppHttpError({
    code: 'address/not-found',
    message: 'Not found.',
    httpStatus: 404,
  })

const tenantNotFound = () =>
  new AppHttpError({
    code: 'tenant/not-found',
    message: 'Not found.',
    httpStatus: 404,
  })

const inUse = () =>
  new AppHttpError({
    code: 'address/in-use',
    message: 'This address is still in use.',
    httpStatus: 409,
  })

export type AddressCreateData = Record<string, unknown>
export type AddressUpdateData = Record<string, unknown>

export async function listAddresses(
  tenantId: string,
  query: ListAddressesQuery
): Promise<{ data: Address[]; hasMore: boolean }> {
  const rows = await repo.listAddresses({
    tenantId,
    isActive: query.is_active,
    countryCode: query.country_code,
    limit: query.limit,
    startingAfter: query.starting_after,
    endingBefore: query.ending_before,
  })
  const page = rows.slice(0, query.limit)
  return {
    data: (query.ending_before ? page.reverse() : page).map(serializeAddress),
    hasMore: rows.length > query.limit,
  }
}

export async function retrieveAddress(
  tenantId: string,
  id: string
): Promise<Address> {
  const address = await repo.findAddress(tenantId, id)
  if (!address) throw notFound()
  return serializeAddress(address)
}

export async function createAddress(
  tenantId: string,
  input: AddressCreateBody
): Promise<Address> {
  if (!(await repo.tenantExists(tenantId))) throw tenantNotFound()
  return serializeAddress(
    await repo.createAddress(await buildAddressCreateData(tenantId, input))
  )
}

export async function updateAddress(
  tenantId: string,
  id: string,
  input: AddressUpdateBody
): Promise<Address> {
  const current = await repo.findAddress(tenantId, id)
  if (!current) throw notFound()
  return serializeAddress(
    await repo.updateAddress({
      id: current.id,
      data: await buildAddressUpdateData(current, input),
    })
  )
}

export async function deleteAddress(
  tenantId: string,
  id: string
): Promise<void> {
  const outcome = await deleteAddressIfUnused(tenantId, id)
  if (outcome === 'not_found') throw notFound()
  if (outcome === 'in_use') throw inUse()
}

/**
 * Removes an address only after a caller has removed one of its references.
 * The result lets the customer-address service preserve a successful relation
 * delete when another owner began using the address before this cleanup runs.
 */
export function deleteAddressIfUnused(
  tenantId: string,
  id: string
): Promise<'not_found' | 'in_use' | 'deleted'> {
  return repo.deleteAddressIfUnused(tenantId, id)
}

/** Builds persisted fields after resolving the authoritative region snapshot. */
export async function buildAddressCreateData(
  tenantId: string,
  input: AddressCreateBody
): Promise<AddressCreateData> {
  const geography = await resolveRegion(input.country_code, input.region_code)
  if (!geography.ok) throw addressError(geography.code)

  const now = nowUnixSeconds()
  return {
    tenantId,
    name: input.name,
    line1: input.line1,
    line2: input.line2 ?? null,
    city: input.city,
    countryCode: input.country_code,
    regionCode: geography.region.regionCode,
    regionName: geography.region.regionName,
    postalCode: input.postal_code ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    isActive: input.is_active ?? true,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Resolves geography only when it changes, preserving migrated region snapshots
 * when a non-geographic field is updated.
 */
export async function buildAddressUpdateData(
  current: Pick<AddressRow, 'countryCode' | 'regionCode'>,
  input: AddressUpdateBody
): Promise<AddressUpdateData> {
  const countryChanged =
    input.country_code !== undefined &&
    input.country_code !== current.countryCode
  const regionChanged =
    input.region_code !== undefined && input.region_code !== current.regionCode
  const data: AddressUpdateData = { updatedAt: nowUnixSeconds() }

  if (input.name !== undefined) data.name = input.name
  if (input.line1 !== undefined) data.line1 = input.line1
  if (input.line2 !== undefined) data.line2 = input.line2 ?? null
  if (input.city !== undefined) data.city = input.city
  if (input.postal_code !== undefined)
    data.postalCode = input.postal_code ?? null
  if (input.latitude !== undefined) data.latitude = input.latitude
  if (input.longitude !== undefined) data.longitude = input.longitude
  if (input.is_active !== undefined) data.isActive = input.is_active

  if (countryChanged || regionChanged) {
    const countryCode = input.country_code ?? current.countryCode
    const geography = await resolveRegion(countryCode, input.region_code)
    if (!geography.ok) throw addressError(geography.code)
    data.countryCode = countryCode
    data.regionCode = geography.region.regionCode
    data.regionName = geography.region.regionName
  }

  return data
}

function addressError(code: string): AppHttpError {
  const message: Record<string, string> = {
    'address/geography-unavailable': 'Geographic validation is unavailable.',
    'address/unknown-country': 'Unknown country.',
    'address/region-required': 'A region is required for this country.',
    'address/unknown-region': 'Unknown region.',
  }
  return new AppHttpError({
    code,
    message: message[code] ?? 'Invalid address.',
    httpStatus: code === 'address/geography-unavailable' ? 503 : 422,
  })
}
