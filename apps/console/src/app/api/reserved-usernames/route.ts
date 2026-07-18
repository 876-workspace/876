import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  const { response } = await requireConsolePermission('console:settings')
  if (response) return response

  const { data, error } = await $876.reservedUsernames.list()
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to load reserved usernames.' },
      { status: 400 }
    )
  }
  return apiJson({ data: data.data })
}

export async function POST(request: NextRequest): Promise<Response> {
  const { response } = await requireConsolePermission('console:settings')
  if (response) return response

  const body = (await request.json().catch(() => null)) as {
    username?: unknown
    reason?: unknown
  } | null

  if (!body || typeof body.username !== 'string' || !body.username.trim()) {
    return apiJson({ error: 'username is required.' }, { status: 400 })
  }

  const { data, error } = await $876.reservedUsernames.create({
    username: body.username.trim(),
    reason: typeof body.reason === 'string' ? body.reason.trim() || null : null,
  })

  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to reserve username.' },
      { status: 400 }
    )
  }
  return apiJson({ data }, { status: 201 })
}
