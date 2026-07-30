import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { get876ServerClient } from '@/lib/876/server'
import { authorizeOrgRequest } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

const OWNER_ROLE = 'owner'

/**
 * Changes a member's org role. Pure transport over `$876.organizationMembers.update`.
 *
 * Owner-role transitions are checked here for a direct UI response and
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

  const client = await get876ServerClient()
  const orgId = auth.membership.organization.id

  const membersResult = await client.organizationMembers.list(orgId)
  const members = membersResult.data?.data ?? []
  const target = members.find((member) => member.id === membershipId)
  if (!target) {
    return apiJson({ error: 'Member not found.' }, { status: 404 })
  }

  const ownerInvolved = target.role === OWNER_ROLE || role === OWNER_ROLE
  if (ownerInvolved && auth.membership.role !== OWNER_ROLE) {
    return apiJson(
      { error: 'Only an owner can grant or remove the owner role.' },
      { status: 403 }
    )
  }

  const { data, error } = await client.organizationMembers.update(
    orgId,
    membershipId,
    { role }
  )
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
 * owner/last-owner protections enforced again by the delegated-session API.
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

  const client = await get876ServerClient()
  const orgId = auth.membership.organization.id

  const membersResult = await client.organizationMembers.list(orgId)
  const members = membersResult.data?.data ?? []
  const target = members.find((member) => member.id === membershipId)
  if (!target) {
    return apiJson({ error: 'Member not found.' }, { status: 404 })
  }

  if (target.role === OWNER_ROLE) {
    if (auth.membership.role !== OWNER_ROLE) {
      return apiJson(
        { error: 'Only an owner can remove an owner.' },
        { status: 403 }
      )
    }

    const otherActiveOwners = members.filter(
      (member) =>
        member.id !== membershipId &&
        member.role === OWNER_ROLE &&
        member.status === 'active'
    )
    if (otherActiveOwners.length === 0) {
      return apiJson(
        { error: 'An organization must keep at least one owner.' },
        { status: 400 }
      )
    }
  }

  const { data, error } = await client.organizationMembers.delete(
    orgId,
    membershipId
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to remove the member.' },
      { status: 400 }
    )
  }

  return apiJson({ data })
}
