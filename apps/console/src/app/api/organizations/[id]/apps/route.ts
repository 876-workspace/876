import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

import {
  mirrorCoreSubscription,
  withBillingSyncHeader,
} from '@/lib/billing/mirror'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

/** Creates an org's subscription to a platform app. */
export async function POST(
  request: NextRequest,
  { params }: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: orgId } = await params
  const body = (await request.json().catch(() => null)) as {
    app_slug?: string
    app_id?: string
    price_id?: string
  } | null

  if (!body?.app_slug && !body?.app_id) {
    return apiJson({ error: 'Provide app_slug or app_id.' }, { status: 400 })
  }

  const { data, error } = await $876.orgs.subscriptions.provision(orgId, {
    appSlug: body.app_slug,
    appId: body.app_id,
    priceId: body.price_id,
  })
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to create subscription.' },
      { status: 400 }
    )
  }
  const billingSynced = await mirrorCoreSubscription(data)
  return withBillingSyncHeader(apiJson({ data }), billingSynced)
}
