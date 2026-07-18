import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Context = { params: Promise<{ userId: string; featureId: string }> }

export async function PATCH(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:features')
  if (response) return response

  const { userId, featureId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { data, error } = await $876.users.updateFeature(
    userId,
    featureId,
    body
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to update user feature.' },
      { status: 400 }
    )
  }

  return apiJson({ data })
}

export async function DELETE(
  _request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:features')
  if (response) return response

  const { userId, featureId } = await context.params
  const { data, error } = await $876.users.revokeFeature(userId, featureId)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to revoke user feature.' },
      { status: 400 }
    )
  }

  return apiJson({ data })
}
