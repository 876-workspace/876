import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'
import {
  mirrorCoreSubscription,
  withBillingSyncHeader,
} from '@/lib/billing/mirror'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string; appId: string }> }

/** Updates an org's subscription status (active / blocked), price, or cancellation flag. */
export async function PATCH(
  request: NextRequest,
  { params }: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: orgId, appId } = await params
  const body = (await request.json().catch(() => null)) as {
    status?: string
    price_id?: string
    cancel_at_period_end?: boolean
  } | null

  if (
    body?.status !== undefined &&
    body.status !== 'active' &&
    body.status !== 'blocked'
  ) {
    return apiJson(
      { error: 'status must be active or blocked.' },
      { status: 400 }
    )
  }
  if (
    body?.status === undefined &&
    body?.price_id === undefined &&
    body?.cancel_at_period_end === undefined
  ) {
    return apiJson(
      { error: 'Provide status, price_id, or cancel_at_period_end.' },
      { status: 400 }
    )
  }

  const { data, error } = await $876.orgs.subscriptions.update(orgId, appId, {
    status: body?.status as 'active' | 'blocked' | undefined,
    price_id: body?.price_id,
    cancel_at_period_end: body?.cancel_at_period_end,
  })
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to update subscription.' },
      { status: 400 }
    )
  }
  const billingSynced = await mirrorCoreSubscription(data)
  return withBillingSyncHeader(apiJson({ data }), billingSynced)
}
