import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'
import {
  mirrorCoreSubscription,
  withBillingSyncHeader,
} from '@/lib/billing/mirror'

export const runtime = 'nodejs'

export async function POST(request: NextRequest): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const { data, error } = await $876.subscriptions.create(body)
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to create subscription.' },
      { status: 400 }
    )

  const billingSynced = await mirrorCoreSubscription(data)
  return withBillingSyncHeader(
    apiJson({ data }, { status: 201 }),
    billingSynced
  )
}
