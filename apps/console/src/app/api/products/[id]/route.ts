import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'
import {
  mirrorCoreProductPrices,
  withBillingSyncHeader,
} from '@/lib/billing/mirror'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

/** Updates a product's display fields or status. */
export async function PATCH(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { data, error } = await $876.products.update(id, body)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to update product.' },
      { status: 400 }
    )
  }

  const billingSynced = await mirrorCoreProductPrices(data, data.prices)
  return withBillingSyncHeader(apiJson({ data }), billingSynced)
}

/** Archives a product (status -> archived). Subscribed orgs keep their subscription item. */
export async function DELETE(
  _request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { id } = await context.params
  const { data, error } = await $876.products.archive(id)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to archive product.' },
      { status: 400 }
    )
  }

  const product = await $876.products.retrieve(id)
  const billingSynced = product.data
    ? await mirrorCoreProductPrices(product.data, product.data.prices)
    : false
  return withBillingSyncHeader(apiJson({ data }), billingSynced)
}
