import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
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
  const { data, error } = await $876.orgs.listInvites(id)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to list invites.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
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
    email?: string
    role?: string
  } | null

  if (!body?.email) {
    return apiJson({ error: 'email is required.' }, { status: 400 })
  }

  const { data, error } = await $876.orgs.createInvite(id, {
    email: body.email,
    role: body.role,
  })
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to create invite.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}
