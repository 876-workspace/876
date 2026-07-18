import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { getAdminClient } from '@/lib/auth/admin-client'
import { authorizeOrgRequest } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

/** Creates a member invite. Pure transport over `$876.orgs.createInvite`. */
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

  // Granting owner via invite is owner-only, same as direct role changes.
  if (role === 'owner' && auth.membership.role !== 'owner') {
    return apiJson(
      { error: 'Only an owner can invite another owner.' },
      { status: 403 }
    )
  }

  const client = await getAdminClient()
  const orgId = auth.membership.organization.id

  if (role) {
    const rolesResult = await client.orgs.roles.list(orgId)
    const roles = rolesResult.data?.data ?? []
    if (!roles.some((r) => r.name === role)) {
      return apiJson(
        { error: 'No role exists with the provided name.' },
        { status: 400 }
      )
    }
  }

  const { data, error } = await client.orgs.createInvite(orgId, {
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
