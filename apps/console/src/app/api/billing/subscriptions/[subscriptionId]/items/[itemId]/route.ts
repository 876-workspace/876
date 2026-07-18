import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'
import {
  mirrorCoreSubscriptionById,
  withBillingSyncHeader,
} from '@/lib/billing/mirror'

export const runtime = 'nodejs'

type Context = { params: Promise<{ subscriptionId: string; itemId: string }> }

export async function PATCH(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { subscriptionId, itemId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const { data, error } = await $876.subscriptions.updateItem(
    subscriptionId,
    itemId,
    body
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to update subscription item.' },
      { status: 400 }
    )

  const billingSynced = await mirrorCoreSubscriptionById(subscriptionId)
  return withBillingSyncHeader(apiJson({ data }), billingSynced)
}

export async function DELETE(
  _request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { subscriptionId, itemId } = await context.params
  const { data, error } = await $876.subscriptions.deleteItem(
    subscriptionId,
    itemId
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to delete subscription item.' },
      { status: 400 }
    )

  const billingSynced = await mirrorCoreSubscriptionById(subscriptionId)
  return withBillingSyncHeader(apiJson({ data }), billingSynced)
}
