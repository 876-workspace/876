import { workspace } from '@/lib/services/workspace'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

/** Adds an existing 876 user to an organization. */
export async function POST(
  request: NextRequest,
  { params }: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id } = await params
  const body = (await request.json().catch(() => null)) as {
    userId?: unknown
    role?: unknown
  } | null
  const userId = typeof body?.userId === 'string' ? body.userId.trim() : ''
  const role = typeof body?.role === 'string' ? body.role.trim() : ''

  if (!userId) return apiJson({ error: 'userId is required.' }, { status: 400 })
  if (!role) return apiJson({ error: 'role is required.' }, { status: 400 })

  const { data, error } = await workspace.members.create(id, {
    userId,
    role,
  })

  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to add member.' },
      { status: 400 }
    )
  }

  return apiJson({ data }, { status: 201 })
}
