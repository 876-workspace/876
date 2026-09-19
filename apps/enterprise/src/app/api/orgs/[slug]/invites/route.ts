import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { getWorkspace } from '@/lib/clients/workspace'
import { authorizeOrgRequest } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

/** Creates a member invite. Pure transport over `$876.invites.create`. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params

  const auth = await authorizeOrgRequest(slug, 'members:invite')
  if (auth.response) return auth.response

  const body = (await request.json().catch(() => null)) as {
    email?: unknown
    role?: unknown
  } | null
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const role = typeof body?.role === 'string' ? body.role.trim() : ''
  if (!email || !email.includes('@')) {
    return apiJson(
      { error: 'A valid email address is required.' },
      { status: 400 }
    )
  }

  if (role === 'super-admin' && auth.membership.role !== 'super-admin') {
    return apiJson(
      { error: 'Only a super admin can invite another super admin.' },
      { status: 403 }
    )
  }

  const client = await getWorkspace()
  const orgId = auth.membership.organization.id

  if (role) {
    const rolesResult = await client.roles.list(orgId)
    const roles = rolesResult.data?.data ?? []
    if (!roles.some((r) => r.name === role)) {
      return apiJson(
        { error: 'No role exists with the provided name.' },
        { status: 400 }
      )
    }
  }

  const { data, error } = await client.invites.create(orgId, {
    email,
    ...(role ? { role } : {}),
  })
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to create the invite.' },
      { status: 400 }
    )
  }

  return apiJson({ data }, { status: 201 })
}
