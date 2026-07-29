import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

export async function POST(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:users')
  if (response) return response

  const { id } = await context.params
  const body = (await request.json().catch(() => null)) as {
    reason?: unknown
  } | null
  const reason = body && typeof body.reason === 'string' ? body.reason : null

  const { data, error } = await $876.users.ban(id, { reason })
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to ban user.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}
