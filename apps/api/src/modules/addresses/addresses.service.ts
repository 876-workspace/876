import { AppHttpError } from '@/http/errors'
import { listObject, type ListObject } from '@/http/envelope'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

import * as repository from './addresses.repository'
import type {
  Address,
  CreateAddressBody,
  ListAddressesQuery,
  UpdateAddressBody,
} from './addresses.schemas'
import { serializeAddress } from './addresses.serializers'

/**
 * Addresses owned by a user or an organization.
 *
 * An address belongs to exactly one owner. Both columns are nullable, so the
 * "exactly one" rule is enforced here rather than by the schema — and it is
 * enforced on the way in, because a row with two owners has no correct reading.
 */

function invalidRequest(message: string): AppHttpError {
  return new AppHttpError({
    code: 'provider/invalid-request',
    message,
    httpStatus: 400,
  })
}

function requireExactlyOneOwner(
  userId: string | null | undefined,
  organizationId: string | null | undefined
): void {
  if (!userId && !organizationId)
    throw invalidRequest('userId or organizationId is required.')

  if (userId && organizationId)
    throw invalidRequest('Provide userId or organizationId, not both.')
}

const notFound = () =>
  new AppHttpError({
    code: 'address/not-found',
    message: 'Address not found.',
    httpStatus: 404,
  })

export async function listAddresses(
  query: ListAddressesQuery
): Promise<ListObject<Address>> {
  requireExactlyOneOwner(query.userId, query.organizationId)

  const rows = query.userId
    ? await repository.listByUser(query.userId)
    : await repository.listByOrganization(query.organizationId as string)

  return listObject({
    data: rows.map(serializeAddress),
    hasMore: false,
    url: '/addresses',
  })
}

export async function createAddress(body: CreateAddressBody): Promise<Address> {
  requireExactlyOneOwner(body.userId, body.organizationId)

  const now = BigInt(nowUnixSeconds())
  const row = await repository.create({
    id: generateId('address'),
    userId: body.userId,
    organizationId: body.organizationId,
    type: body.type,
    label: body.label,
    line1: body.line1,
    line2: body.line2,
    city: body.city,
    regionId: body.regionId,
    countryCode: body.countryCode,
    postalCode: body.postalCode,
    isDefault: body.isDefault,
    createdAt: now,
    updatedAt: now,
  })

  return serializeAddress(row)
}

export async function retrieveAddress(addressId: string): Promise<Address> {
  const row = await repository.findById(addressId)
  if (!row) throw notFound()

  return serializeAddress(row)
}

/**
 * Apply only the fields that were sent.
 *
 * An empty update is rejected rather than treated as a no-op: it almost always
 * means the caller sent a field name this endpoint does not accept, and
 * answering 200 would hide that.
 */
export async function updateAddress(
  addressId: string,
  body: UpdateAddressBody
): Promise<Address> {
  const data = Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined)
  )
  if (Object.keys(data).length === 0)
    throw invalidRequest('No fields to update.')

  const row = await repository.update(addressId, {
    ...data,
    updatedAt: BigInt(nowUnixSeconds()),
  })
  if (!row) throw notFound()

  return serializeAddress(row)
}

/**
 * Hard delete, as the FastAPI route does — the table carries no tombstone
 * columns. See `.claude/rules/deletions.md`: adding them is a schema change,
 * not something to invent during a migration.
 */
export async function deleteAddress(
  addressId: string
): Promise<{ object: 'address'; id: string; deleted: true }> {
  const deleted = await repository.remove(addressId)
  if (!deleted) throw notFound()

  return { object: 'address', id: addressId, deleted: true }
}
