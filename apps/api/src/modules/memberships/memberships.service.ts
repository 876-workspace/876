import { getSettings } from '@/config'
import { listObject, type ListObject } from '@/http/envelope'
import { AppHttpError } from '@/platform/errors'
import { generateId } from '@/platform/ids'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'
import { getAuthProvider } from '@/providers/workos/adapter'
import {
  deleteProviderMembership,
  ensureProviderMembership,
} from '@/services/identity-sync'
import { assignMemberApps, linkMembershipRole } from '@/services/provisioning'

import * as repository from './memberships.repository'
import type {
  CreateMembershipBody,
  ListMembershipsQuery,
  Membership,
  UpdateMembershipBody,
} from './memberships.schemas'
import { serializeMembership } from './memberships.serializers'

const log = getLogger('memberships')

async function requireMembership(membershipId: string) {
  const row = await repository.findMembershipById(membershipId)
  if (!row)
    throw new AppHttpError({
      code: 'membership/not-found',
      message: 'No membership exists with the provided identifier.',
      httpStatus: 404,
    })
  return row
}

export async function listMemberships(
  query: ListMembershipsQuery
): Promise<ListObject<Membership>> {
  const { data, hasMore } = await repository.listMemberships(query)
  return listObject({
    data: data.map(serializeMembership),
    hasMore,
    url: '/memberships',
  })
}

export async function retrieveMembership(
  membershipId: string
): Promise<Membership> {
  return serializeMembership(await requireMembership(membershipId))
}

export async function createMembership(
  body: CreateMembershipBody
): Promise<Membership> {
  const org = await repository.findOrganizationById(body.organization_id)
  if (!org) {
    throw new AppHttpError({
      code: 'membership/validation-failed',
      message: 'Please check the membership input and try again.',
      httpStatus: 400,
    })
  }
  const user = await repository.findUserById(body.user_id)
  if (!user) {
    throw new AppHttpError({
      code: 'membership/not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })
  }
  const existing = await repository.findMembershipByOrgAndUser(
    body.organization_id,
    body.user_id
  )
  if (existing) {
    throw new AppHttpError({
      code: 'membership/duplicate',
      message: 'This user is already a member of the organization.',
      httpStatus: 409,
    })
  }

  const now = nowUnixSeconds()
  const role = body.role ?? 'member'
  const status = body.status ?? 'active'

  const workosOrgId =
    (org as { workosOrganizationId?: string | null }).workosOrganizationId ??
    null
  const workosUserId =
    (user as { workosUserId?: string | null }).workosUserId ?? null
  // Mirror the membership into WorkOS first: without it the member can never
  // receive an org-scoped session, and an admin-created membership would look
  // active in Console while the provider knows nothing about it. Creating the
  // provider record before the local row means a provider failure aborts the
  // whole operation instead of leaving a local-only membership behind.
  const workosMembershipId = await ensureProviderMembership(
    getAuthProvider(getSettings()),
    {
      workosOrganizationId: workosOrgId,
      workosUserId: workosUserId,
      role,
    }
  )

  const membership = await repository.createMembership({
    id: generateId('membership'),
    organizationId: body.organization_id,
    userId: body.user_id,
    workosMembershipId,
    role,
    status,
    createdAt: BigInt(now),
    updatedAt: BigInt(now),
  })

  await linkMembershipRole(
    {
      id: membership.id,
      organizationId: membership.organizationId,
      role: membership.role,
      roleId: membership.roleId,
    },
    now
  )
  if (membership.status === 'active') {
    await assignMemberApps({
      organizationId: body.organization_id,
      userId: body.user_id,
      now,
    })
  }

  log.info(
    {
      membership_id: membership.id,
      organization_id: body.organization_id,
      user_id: body.user_id,
      role: membership.role,
    },
    'memberships.create'
  )

  return serializeMembership(membership)
}

export async function updateMembership(
  membershipId: string,
  body: UpdateMembershipBody
): Promise<Membership> {
  const membership = await requireMembership(membershipId)

  const updateData: Record<string, unknown> = {}

  // A null is "not supplied", not "clear it" — the Python guards every field
  // with `is not None`, so there is no way to unset the provider link here.
  if (
    body.workos_membership_id !== undefined &&
    body.workos_membership_id !== null
  ) {
    const existing = await repository.findMembershipByWorkosId(
      body.workos_membership_id
    )
    if (existing && existing.id !== membershipId) {
      throw new AppHttpError({
        code: 'membership/validation-failed',
        message: 'Please check the membership input and try again.',
        httpStatus: 400,
      })
    }
    updateData.workosMembershipId = body.workos_membership_id
  }
  if (body.role !== undefined && body.role !== null) updateData.role = body.role
  if (body.status !== undefined && body.status !== null)
    updateData.status = body.status

  const now = nowUnixSeconds()
  updateData.updatedAt = BigInt(now)

  // Map camelCase keys to repository expected keys
  const repoData: Parameters<typeof repository.updateMembership>[1] = {}
  if ('workosMembershipId' in updateData)
    repoData.workosMembershipId = updateData.workosMembershipId as string | null
  if ('role' in updateData) repoData.role = updateData.role as string
  if ('status' in updateData) repoData.status = updateData.status as string
  repoData.updatedAt = updateData.updatedAt as bigint

  const updated = await repository.updateMembership(membershipId, repoData)
  if (!updated)
    throw new AppHttpError({
      code: 'membership/not-found',
      message: 'No membership exists with the provided identifier.',
      httpStatus: 404,
    })

  if (body.role !== undefined && body.role !== null) {
    await linkMembershipRole(
      {
        id: updated.id,
        organizationId: updated.organizationId,
        role: updated.role,
        roleId: updated.roleId,
      },
      now
    )
  }

  log.info(
    {
      membership_id: membership.id,
      organization_id: membership.organizationId,
      user_id: membership.userId,
      changed_fields: Object.keys(repoData).sort(),
      role: repoData.role,
    },
    'memberships.update'
  )

  return serializeMembership(updated)
}

export async function deleteMembership(
  membershipId: string
): Promise<{ object: string; id: string; deleted: boolean }> {
  const membership = await requireMembership(membershipId)
  const workosMembershipId = membership.workosMembershipId
  await repository.deleteMembership(membershipId)

  // Called unconditionally: the helper already treats a null id and an
  // already-absent provider record as success, and swallowing a real provider
  // failure here would leave an orphaned WorkOS membership nothing reconciles.
  await deleteProviderMembership(
    getAuthProvider(getSettings()),
    workosMembershipId,
    { localMembershipId: membershipId }
  )

  log.info(
    {
      membership_id: membershipId,
      organization_id: membership.organizationId,
      user_id: membership.userId,
    },
    'memberships.delete'
  )

  return { object: 'membership', id: membershipId, deleted: true }
}
