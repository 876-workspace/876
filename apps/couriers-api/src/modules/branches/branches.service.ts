import { AppHttpError } from '@/platform/errors'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'
import { resolveRegion } from '@/providers/platform/geo'
import { syncOrganizationLocation } from '@/modules/organization-locations'

import * as repo from './branches.repository'
import { serializeBranch, type BranchRow } from './branches.serializers'
import type {
  Branch,
  CreateBranchBody,
  ListBranchesQuery,
  UpdateBranchBody,
} from './branches.schemas'

const notFound = () =>
  new AppHttpError({
    code: 'branch/not-found',
    message: 'Not found.',
    httpStatus: 404,
  })

const tenantNotFound = () =>
  new AppHttpError({
    code: 'tenant/not-found',
    message: 'Not found.',
    httpStatus: 404,
  })

const conflict = (message: string) =>
  new AppHttpError({ code: 'branch/conflict', message, httpStatus: 409 })

const log = getLogger('branches')

export async function retrieveBranch(
  tenantId: string,
  id: string
): Promise<Branch> {
  const row = await repo.findBranch(tenantId, id)
  if (!row) throw notFound()
  return serializeBranch(row)
}

export async function listBranches(
  tenantId: string,
  query: ListBranchesQuery
): Promise<{ branches: Branch[]; hasMore: boolean }> {
  const rows = await repo.listBranches({
    tenantId,
    isActive: query.is_active,
    limit: query.limit,
    startingAfter: query.starting_after,
    endingBefore: query.ending_before,
  })
  const page = rows.slice(0, query.limit)
  return {
    branches: (query.ending_before ? page.reverse() : page).map(
      serializeBranch
    ),
    hasMore: rows.length > query.limit,
  }
}

export async function createBranch(
  tenantId: string,
  input: CreateBranchBody
): Promise<Branch> {
  if (!(await repo.tenantExists(tenantId))) throw tenantNotFound()
  const address = await createAddressData(tenantId, input.address)
  const now = nowUnixSeconds()

  let branch: import('./branches.serializers').BranchRow
  try {
    branch = await repo.createBranchWithAddress({ tenantId, input, address, now })
  } catch (error) {
    if (isUniqueConstraintError(error))
      throw conflict('A branch with that name already exists.')
    throw error
  }
  void syncOrganizationLocation(tenantId, { kind: 'branch', site_id: branch.id }).catch((error) => {
    log.error({ err: error, tenant_id: tenantId, site_id: branch.id }, 'branch.organization_location_sync_failed')
  })
  return serializeBranch(branch)
}

export async function updateBranch(
  tenantId: string,
  id: string,
  input: UpdateBranchBody
): Promise<Branch> {
  const current = await repo.findBranch(tenantId, id)
  if (!current) throw notFound()
  if (current.isDefault && input.is_default === false)
    throw conflict(
      'Set another branch as the default instead of clearing this one.'
    )

  const address = input.address
    ? await updateAddressData(current.address!, input.address)
    : undefined
  const now = nowUnixSeconds()

  let updated: import('./branches.serializers').BranchRow
  try {
    updated = await repo.updateBranchWithAddress({
      tenantId,
      current,
      input,
      address,
      now,
    })
  } catch (error) {
    if (isUniqueConstraintError(error))
      throw conflict('A branch with that name already exists.')
    throw error
  }
  void syncOrganizationLocation(tenantId, { kind: 'branch', site_id: updated.id }).catch((error) => {
    log.error({ err: error, tenant_id: tenantId, site_id: updated.id }, 'branch.organization_location_sync_failed')
  })
  return serializeBranch(updated)
}

async function createAddressData(
  tenantId: string,
  address: CreateBranchBody['address']
) {
  const geography = await resolveRegion(
    address.country_code,
    address.region_code
  )
  if (!geography.ok) throw addressError(geography.code)
  const now = nowUnixSeconds()
  return {
    tenantId,
    name: address.name,
    line1: address.line1,
    line2: address.line2 ?? null,
    city: address.city,
    countryCode: address.country_code,
    regionCode: geography.region.regionCode,
    regionName: geography.region.regionName,
    postalCode: address.postal_code ?? null,
    latitude: address.latitude ?? null,
    longitude: address.longitude ?? null,
    isActive: address.is_active ?? true,
    createdAt: now,
    updatedAt: now,
  }
}

async function updateAddressData(
  current: NonNullable<BranchRow['address']>,
  address: NonNullable<UpdateBranchBody['address']>
) {
  const countryChanged =
    address.country_code !== undefined &&
    address.country_code !== current.countryCode
  const regionChanged =
    address.region_code !== undefined &&
    address.region_code !== current.regionCode
  const data: Record<string, unknown> = { updatedAt: nowUnixSeconds() }
  if (address.name !== undefined) data.name = address.name
  if (address.line1 !== undefined) data.line1 = address.line1
  if (address.line2 !== undefined) data.line2 = address.line2 ?? null
  if (address.city !== undefined) data.city = address.city
  if (address.postal_code !== undefined)
    data.postalCode = address.postal_code ?? null
  if (address.latitude !== undefined) data.latitude = address.latitude ?? null
  if (address.longitude !== undefined)
    data.longitude = address.longitude ?? null
  if (address.is_active !== undefined) data.isActive = address.is_active
  if (countryChanged || regionChanged) {
    const geography = await resolveRegion(
      address.country_code ?? current.countryCode,
      address.region_code
    )
    if (!geography.ok) throw addressError(geography.code)
    data.countryCode = address.country_code ?? current.countryCode
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

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  )
}
