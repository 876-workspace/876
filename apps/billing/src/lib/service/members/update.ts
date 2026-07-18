import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { MemberUpdateParams } from '@/types/access'
import type { ServiceResult } from '@/types/api'
import type { OrgRole } from '@/types/auth'

import { err, ok } from '../result'

/** Assigns one tenant role while preventing owner loss and self-lockout. */
export async function update(
  tenantId: string,
  targetUserId: string,
  params: MemberUpdateParams,
  actor: { userId: string; roleSlug: string },
  targetOrgRole: OrgRole
): ServiceResult<{ id: string; userId: string }> {
  if (targetUserId === actor.userId)
    return err('You cannot change your own Billing access.', 409)

  const role = await prisma.role.findFirst({
    where: { id: params.roleId, tenantId },
  })
  if (!role) return err('Select a role from this workspace.', 422)

  if (
    targetOrgRole === 'owner' &&
    (role.slug !== 'owner' || params.status !== 'ACTIVE')
  )
    return err(
      'The organization owner must retain active Billing owner access.',
      409
    )
  if (role.slug === 'owner' && actor.roleSlug !== 'owner')
    return err('Only a Billing owner can grant the owner role.', 403)

  const existing = await prisma.member.findUnique({
    where: { tenantId_userId: { tenantId, userId: targetUserId } },
    include: { role: true },
  })
  if (
    existing?.role.slug === 'owner' &&
    existing.status === 'ACTIVE' &&
    (role.slug !== 'owner' || params.status !== 'ACTIVE')
  ) {
    const ownerCount = await prisma.member.count({
      where: { tenantId, status: 'ACTIVE', role: { slug: 'owner' } },
    })
    if (ownerCount <= 1)
      return err('A workspace must keep at least one active owner.', 409)
  }

  const now = nowUnixSeconds()
  const member = await prisma.member.upsert({
    where: { tenantId_userId: { tenantId, userId: targetUserId } },
    create: {
      id: generateId('Member'),
      tenantId,
      userId: targetUserId,
      roleId: role.id,
      status: params.status,
      createdAt: now,
      updatedAt: now,
    },
    update: { roleId: role.id, status: params.status, updatedAt: now },
  })

  return ok({ id: member.id, userId: member.userId })
}
