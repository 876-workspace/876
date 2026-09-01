import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { getWorkspace } from '@/lib/services/workspace'
import { authorizeOrgRequest } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

const SUPER_ADMIN_ROLE = 'super_admin'

/**
 * Changes a member's org role. Pure transport over `$876.organizationMembers.update`.
 *
 * Super-admin transitions are checked here for a direct UI response and
 * independently enforced by the delegated-session API.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string; membershipId: string }> }
): Promise<Response> {
  const { slug, membershipId } = await context.params

  const auth = await authorizeOrgRequest(slug, 'members:manage')
  if (auth.response) return auth.response

  const body = (await request.json().catch(() => null)) as {
    role?: unknown
  } | null
  const role = typeof body?.role === 'string' ? body.role.trim() : ''
  if (!role) {
    return apiJson({ error: 'A role is required.' }, { status: 400 })
  }

  const client = await getWorkspace()
  const orgId = auth.membership.organization.id

  const membersResult = await client.members.list(orgId)
  const members = membersResult.data?.data ?? []
  const target = members.find((member) => member.id === membershipId)
  if (!target) {
    return apiJson({ error: 'Member not found.' }, { status: 404 })
  }

  const superAdminInvolved =
    target.role === SUPER_ADMIN_ROLE || role === SUPER_ADMIN_ROLE
  if (superAdminInvolved && auth.membership.role !== SUPER_ADMIN_ROLE) {
    return apiJson(
      { error: 'Only a super admin can grant or remove super admin.' },
      { status: 403 }
    )
  }

  const { data, error } = await client.members.update(orgId, membershipId, {
    role,
  })
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to change the member role.' },
      { status: 400 }
    )
  }

  return apiJson({ data })
}

/**
 * Removes a member from the organization. Pure transport over
 * `$876.organizationMembers.delete`, with org scoping, self-removal, and
 * super-admin protections enforced again by the delegated-session API.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string; membershipId: string }> }
): Promise<Response> {
  const { slug, membershipId } = await context.params

  const auth = await authorizeOrgRequest(slug, 'members:manage')
  if (auth.response) return auth.response

  if (auth.membership.id === membershipId) {
    return apiJson(
      { error: 'You cannot remove yourself from the organization.' },
      { status: 400 }
    )
  }

  const client = await getWorkspace()
  const orgId = auth.membership.organization.id

  const membersResult = await client.members.list(orgId)
  const members = membersResult.data?.data ?? []
  const target = members.find((member) => member.id === membershipId)
  if (!target) {
    return apiJson({ error: 'Member not found.' }, { status: 404 })
  }

  if (target.role === SUPER_ADMIN_ROLE) {
    if (auth.membership.role !== SUPER_ADMIN_ROLE) {
      return apiJson(
        { error: 'Only a super admin can remove a super admin.' },
        { status: 403 }
      )
    }
  }

  const { data, error } = await client.members.delete(orgId, membershipId)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to remove the member.' },
      { status: 400 }
    )
  }

  return apiJson({ data })
}
