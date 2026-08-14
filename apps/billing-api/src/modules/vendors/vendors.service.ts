import { AppHttpError } from '@/http/errors'
import { hasEnabledCurrency } from '@/modules/currencies'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  createVendorRow,
  deleteVendorRow,
  findVendorRow,
  listVendorRows,
  updateVendorRow,
} from './vendors.repository'
import type {
  VendorCreateBody,
  VendorListQuery,
  VendorUpdateBody,
} from './vendors.schemas'
import { serializeVendor } from './vendors.serializers'

function vendorNotFound(): AppHttpError {
  return new AppHttpError({
    code: 'vendor/not-found',
    message: 'The requested vendor was not found.',
    httpStatus: 404,
  })
}

async function requireEnabledCurrency(
  tenantId: string,
  currency: string | null | undefined
) {
  if (currency && !(await hasEnabledCurrency(tenantId, currency))) {
    throw new AppHttpError({
      code: 'validation/invalid-request',
      message: 'Enable the vendor currency before using it.',
      httpStatus: 422,
    })
  }
}

export async function listVendors(tenantId: string, query: VendorListQuery) {
  const rows = await listVendorRows(tenantId, query.status)
  const hasMore = rows.length > 100

  return {
    object: 'list' as const,
    data: rows.slice(0, 100).map(serializeVendor),
    has_more: hasMore,
    total_count: Math.min(rows.length, 100),
    url: '/api/v1/vendors',
  }
}

export async function retrieveVendor(tenantId: string, vendorId: string) {
  const row = await findVendorRow(tenantId, vendorId)
  if (!row) throw vendorNotFound()

  return serializeVendor(row)
}

export async function createVendor(tenantId: string, body: VendorCreateBody) {
  await requireEnabledCurrency(tenantId, body.currency)
  const now = nowUnixSeconds()

  try {
    const row = await createVendorRow({
      id: generateId('vendor'),
      tenantId,
      externalReference: body.externalReference ?? null,
      name: body.name,
      email: body.email ?? null,
      phone: body.phone ?? null,
      defaultCurrency: body.currency ?? null,
      createdAt: now,
      updatedAt: now,
    })

    return serializeVendor(row)
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new AppHttpError({
        code: 'vendor/conflict',
        message:
          'This core reference or external reference is already a vendor.',
        httpStatus: 409,
      })
    }
    throw error
  }
}

export async function updateVendor(
  tenantId: string,
  vendorId: string,
  body: VendorUpdateBody
) {
  await requireEnabledCurrency(tenantId, body.currency)
  const row = await updateVendorRow(tenantId, vendorId, {
    ...(body.name === undefined ? {} : { name: body.name }),
    ...(body.email === undefined ? {} : { email: body.email }),
    ...(body.phone === undefined ? {} : { phone: body.phone }),
    ...(body.currency === undefined ? {} : { defaultCurrency: body.currency }),
    ...(body.status === undefined ? {} : { status: body.status }),
    updatedAt: nowUnixSeconds(),
  })
  if (!row) throw vendorNotFound()

  return serializeVendor(row)
}

export async function deleteVendor(tenantId: string, vendorId: string) {
  if (!(await deleteVendorRow(tenantId, vendorId))) throw vendorNotFound()

  return { object: 'vendor' as const, id: vendorId, deleted: true as const }
}
