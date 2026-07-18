import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { $876 } from '@/lib/876'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

export async function POST(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:users')
  if (response) return response

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const { data, error } = await $876.users.createContact(id, body)
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to create contact.' },
      { status: 400 }
    )

  return apiJson({ data })
}
