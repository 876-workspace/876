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

/** Adds an additional price to an existing product (e.g. an annual option). */
export async function POST(
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

  const { data, error } = await $876.products.createPrice(id, body)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to create price.' },
      { status: 400 }
    )
  }

  const product = await $876.products.retrieve(id)
  let billingSynced = false
  if (!product.data) {
    console.error(
      '[console.billing.mirror] product retrieve failed:',
      id,
      product.error?.message
    )
  } else {
    billingSynced = await mirrorCoreProductPrices(product.data, [data])
  }

  return withBillingSyncHeader(
    apiJson({ data }, { status: 201 }),
    billingSynced
  )
}
