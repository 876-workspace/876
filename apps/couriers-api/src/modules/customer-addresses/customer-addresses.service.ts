import {
  buildAddressCreateData,
  buildAddressUpdateData,
  deleteAddressIfUnused,
} from '@/modules/addresses'
import { retrieveCustomer } from '@/modules/customers'
import { AppHttpError } from '@/platform/errors'
import { nowUnixSeconds } from '@/platform/timestamps'

import * as repo from './customer-addresses.repository'
import { serializeCustomerAddress } from './customer-addresses.serializers'
import type {
  CreateCustomerAddressBody,
  CustomerAddress,
  ListCustomerAddressesQuery,
  UpdateCustomerAddressBody,
} from './customer-addresses.schemas'

const notFound = () =>
  new AppHttpError({
    code: 'customer-address/not-found',
    message: 'Not found.',
    httpStatus: 404,
  })

const conflict = () =>
  new AppHttpError({
    code: 'customer-address/conflict',
    message: 'That address is already saved for this customer and role.',
    httpStatus: 409,
  })

export async function listCustomerAddresses(
  tenantId: string,
  customerId: string,
  query: ListCustomerAddressesQuery
): Promise<{ data: CustomerAddress[]; hasMore: boolean }> {
  await retrieveCustomer(tenantId, customerId)
  const rows = await repo.listCustomerAddresses({ tenantId, customerId, query })
  const page = rows.slice(0, query.limit)
  return {
    data: (query.ending_before ? page.reverse() : page).map(
      serializeCustomerAddress
    ),
    hasMore: rows.length > query.limit,
  }
}

export async function createCustomerAddress(
  tenantId: string,
  customerId: string,
  input: CreateCustomerAddressBody
): Promise<CustomerAddress> {
  const address = await buildAddressCreateData(tenantId, input.address)
  await retrieveCustomer(tenantId, customerId)
  try {
    return serializeCustomerAddress(
      await repo.createCustomerAddress({
        tenantId,
        customerId,
        input,
        address,
        now: nowUnixSeconds(),
      })
    )
  } catch (error) {
    if (isUniqueConstraintError(error)) throw conflict()
    throw error
  }
}

export async function retrieveCustomerAddress(
  tenantId: string,
  customerId: string,
  id: string
): Promise<CustomerAddress> {
  await retrieveCustomer(tenantId, customerId)
  const row = await repo.findCustomerAddress({ tenantId, customerId, id })
  if (!row) throw notFound()
  return serializeCustomerAddress(row)
}

export async function updateCustomerAddress(
  tenantId: string,
  customerId: string,
  id: string,
  input: UpdateCustomerAddressBody
): Promise<CustomerAddress> {
  await retrieveCustomer(tenantId, customerId)
  const current = await repo.findCustomerAddress({ tenantId, customerId, id })
  if (!current) throw notFound()

  const address = input.address
    ? await buildAddressUpdateData(current.address!, input.address)
    : undefined
  try {
    return serializeCustomerAddress(
      await repo.updateCustomerAddress({
        tenantId,
        current,
        input,
        address,
        now: nowUnixSeconds(),
      })
    )
  } catch (error) {
    if (isUniqueConstraintError(error)) throw conflict()
    throw error
  }
}

export async function deleteCustomerAddress(
  tenantId: string,
  customerId: string,
  id: string
): Promise<void> {
  await retrieveCustomer(tenantId, customerId)
  const deleted = await repo.deleteCustomerAddress({
    tenantId,
    customerId,
    id,
    now: nowUnixSeconds(),
  })
  if (!deleted) throw notFound()

  // A shared address remains available to every other owner. This is a second
  // transaction so the addresses module remains the sole owner of its table;
  // it independently rechecks usage before removing the orphan.
  await deleteAddressIfUnused(tenantId, deleted.addressId)
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  )
}
