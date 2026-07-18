import { prisma } from '@/lib/db'
import type { MemberAccess } from '@/types/access'
import type { OrgRole } from '@/types/auth'

import { defaultAccess, memberAccess } from '../roles/view'

/** Resolves an explicit grant or the safe virtual default for a core member. */
export async function resolve(
  tenantId: string,
  userId: string,
  orgRole: OrgRole
): Promise<MemberAccess | null> {
  if (orgRole !== 'owner') {
    const current = await prisma.member.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      include: { role: true },
    })
    if (current) return memberAccess(current)
  }

  const roleSlug =
    orgRole === 'owner' ? 'owner' : orgRole === 'admin' ? 'admin' : 'viewer'
  const role = await prisma.role.findUnique({
    where: { tenantId_slug: { tenantId, slug: roleSlug } },
  })
  if (!role) return null

  return defaultAccess(userId, role)
}
