import { getSettings } from '@/config'
import { listObject, type ListObject } from '@/http/envelope'
import { AppHttpError, appError } from '@/platform/errors'
import { generateId } from '@/platform/ids'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'
import { getAuthProvider } from '@/providers/workos/adapter'
import {
  deleteProviderMembership,
  ensureProviderMembership,
  updateProviderMembershipRole,
} from '@/services/identity-sync'
import { workspace } from '@/services/workspace'

import * as repository from './memberships.repository'
import type { MembershipDeleteOptions } from './memberships.repository'
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

function initialLocalRoleFromProvider(role: string): string {
  // WorkOS is deliberately a coarse projection of 876 authorization. A
  // provider event can seed a safe initial role for a provider-originated
  // membership, but it cannot infer the stronger 876 super-admin role.
  return role === 'admin' ? 'admin' : 'staff'
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
  const role = body.role ?? 'staff'
  const status = body.status ?? 'active'
  const orgRole = await repository.findRoleByName(body.organization_id, role)
  if (!orgRole) {
    throw appError('role/not-found', {
      message: 'No role exists with the provided name.',
    })
  }

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

  await workspace.roles.link(
    {
      id: membership.id,
      organizationId: membership.organizationId,
      role: membership.role,
      roleId: membership.roleId,
    },
    now
  )
  if (membership.status === 'active')
    await workspace.apps.assign({
      organizationId: body.organization_id,
      userId: body.user_id,
      now,
    })

  log.info(
    {
      membership_id: membership.id,
      organization_id: body.organization_id,
      user_id: body.user_id,
      role: membership.role,
    },
    'memberships.create'
  )

  // Role linking may have populated roleId after the create returned.
  return serializeMembership(await requireMembership(membership.id))
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

  // Map camelCase keys to repository expected keys.
  const repoData: Parameters<typeof repository.updateMembership>[1] = {}
  if ('workosMembershipId' in updateData)
    repoData.workosMembershipId = updateData.workosMembershipId as string | null
  if ('role' in updateData) repoData.role = updateData.role as string
  if ('status' in updateData) repoData.status = updateData.status as string
  repoData.updatedAt = updateData.updatedAt as bigint

  if (body.role !== undefined && body.role !== null) {
    const providerMembershipId =
      body.workos_membership_id !== undefined &&
      body.workos_membership_id !== null
        ? body.workos_membership_id
        : membership.workosMembershipId

    // Provider first for role changes: if a demotion cannot be applied at
    // WorkOS, do not commit a local role change while the provider still carries
    // the old (potentially elevated) role.
    await updateProviderMembershipRole(
      getAuthProvider(getSettings()),
      providerMembershipId,
      body.role,
      { localMembershipId: membershipId }
    )
  }

  const updated = await repository.updateMembership(membershipId, repoData)
  if (!updated)
    throw new AppHttpError({
      code: 'membership/not-found',
      message: 'No membership exists with the provided identifier.',
      httpStatus: 404,
    })

  if (body.role !== undefined && body.role !== null)
    await workspace.roles.link(
      {
        id: updated.id,
        organizationId: updated.organizationId,
        role: updated.role,
        roleId: updated.roleId,
      },
      now
    )

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

  // Role linking is a separate repository write; refetch so the response never
  // exposes a stale roleId from before the workspace role link ran.
  return serializeMembership(await requireMembership(membershipId))
}

/**
 * Soft-deletes a membership locally and removes its WorkOS organization
 * membership through the canonical lifecycle path.
 *
 * Organization-scoped callers may provide audit/status metadata, while the
 * platform-wide admin endpoint keeps its existing default deletion semantics.
 */
export async function deleteMembership(
  membershipId: string,
  options: MembershipDeleteOptions = {}
): Promise<{ object: string; id: string; deleted: boolean }> {
  const membership = await requireMembership(membershipId)
  const workosMembershipId = membership.workosMembershipId
  const deleted = await repository.deleteMembership(membershipId, options)
  if (!deleted) {
    throw new AppHttpError({
      code: 'membership/not-found',
      message: 'No membership exists with the provided identifier.',
      httpStatus: 404,
    })
  }

  // Local access is revoked before the external call. A provider failure is
  // still surfaced, but cannot restore access in the 876 data plane; retry or
  // reconciliation can finish deleting the orphaned WorkOS membership.
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

/**
 * Apply a WorkOS `organization_membership.created`/`.updated` to the local row.
 *
 * WorkOS membership role is only a coarse identity-provider projection of the
 * richer 876 org role. For an existing membership we therefore synchronize
 * provider lifecycle status but preserve the local role. For a provider-created
 * membership with no local row yet, provider admin initializes as local admin
 * and all other provider roles initialize as member. Provider events never
 * manufacture the stronger super-admin role.
 */
export async function upsertMembershipFromWorkos(params: {
  workosMembershipId: string
  organizationId: string | null
  userId: string | null
  role: string
  status: string
}): Promise<'updated' | 'created' | 'skipped'> {
  const existing = await repository.findMembershipByWorkosId(
    params.workosMembershipId
  )
  const now = nowUnixSeconds()

  if (existing) {
    await repository.updateMembership(existing.id, {
      status: params.status,
      updatedAt: BigInt(now),
    })
    await workspace.roles.link(
      {
        id: existing.id,
        organizationId: existing.organizationId,
        role: existing.role,
        roleId: existing.roleId,
      },
      now
    )
    if (params.status === 'active')
      await workspace.apps.assign({
        organizationId: existing.organizationId,
        userId: existing.userId,
        now,
      })
    return 'updated'
  }

  if (!params.organizationId || !params.userId) return 'skipped'

  const role = initialLocalRoleFromProvider(params.role)
  const created = await repository.createMembership({
    id: generateId('membership'),
    organizationId: params.organizationId,
    userId: params.userId,
    workosMembershipId: params.workosMembershipId,
    role,
    status: params.status,
    createdAt: BigInt(now),
    updatedAt: BigInt(now),
  })
  await workspace.roles.link(
    {
      id: created.id,
      organizationId: created.organizationId,
      role: created.role,
      roleId: created.roleId,
    },
    now
  )
  if (created.status === 'active')
    await workspace.apps.assign({
      organizationId: created.organizationId,
      userId: created.userId,
      now,
    })
  return 'created'
}

/**
 * Apply a WorkOS `organization_membership.deleted` by soft-deleting the local
 * membership matched on its WorkOS id. Returns false when none matches.
 */
export async function removeMembershipByWorkosId(
  workosMembershipId: string
): Promise<boolean> {
  const existing = await repository.findMembershipByWorkosId(workosMembershipId)
  if (!existing) return false
  return repository.deleteMembership(existing.id, { status: 'removed' })
}
