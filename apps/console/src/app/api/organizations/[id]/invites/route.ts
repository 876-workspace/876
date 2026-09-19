import { workspace } from '@/lib/clients/workspace'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

/** Lists invite tokens for an organization. */
export async function GET(
  _request: NextRequest,
  { params }: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id } = await params
  const { data, error } = await workspace.invites.list(id)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to list invites.' },
      { status: 400 }
    )
  }
  return apiJson({ data: data.data })
}

/** Creates an invite token for an organization. */
export async function POST(
  request: NextRequest,
  { params }: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id } = await params
  const body = (await request.json().catch(() => null)) as {
    email?: unknown
    role?: unknown
  } | null
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const role = typeof body?.role === 'string' ? body.role.trim() : ''

  if (!email) return apiJson({ error: 'email is required.' }, { status: 400 })

  const { data, error } = await workspace.invites.create(id, {
    email,
    ...(role ? { role } : {}),
  })
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to create invite.' },
      { status: 400 }
    )
  }

  return apiJson({ data }, { status: 201 })
}
