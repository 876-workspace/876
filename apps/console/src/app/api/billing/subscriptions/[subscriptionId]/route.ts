import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'
import {
  mirrorCoreSubscription,
  withBillingSyncHeader,
} from '@/lib/billing/mirror'

export const runtime = 'nodejs'

type Context = { params: Promise<{ subscriptionId: string }> }

export async function PATCH(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { subscriptionId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const { data, error } = await $876.subscriptions.update(subscriptionId, body)
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to update subscription.' },
      { status: 400 }
    )

  const billingSynced = await mirrorCoreSubscription(data)
  return withBillingSyncHeader(apiJson({ data }), billingSynced)
}

export async function DELETE(
  _request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { subscriptionId } = await context.params
  const existing = await $876.subscriptions.retrieve(subscriptionId)
  const { data, error } = await $876.subscriptions.del(subscriptionId)
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to delete subscription.' },
      { status: 400 }
    )

  const billingSynced = existing.data
    ? await mirrorCoreSubscription({ ...existing.data, status: 'canceled' })
    : false
  return withBillingSyncHeader(apiJson({ data }), billingSynced)
}
