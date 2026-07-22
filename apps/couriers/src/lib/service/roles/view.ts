import type { Role } from '@/lib/db'
import { resolveRolePermissions } from '@/lib/permissions'
import type { DefaultRoleKey } from '@/types/permissions'
import type { RoleView } from '@/types/role'

function toDefaultRoleKey(systemKey: string | null): DefaultRoleKey | null {
  return systemKey === 'admin' || systemKey === 'staff' ? systemKey : null
}

export function toRoleView(role: Role, memberCount: number): RoleView {
  const systemKey = toDefaultRoleKey(role.systemKey)

  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: resolveRolePermissions(role),
    isDefault: systemKey !== null,
    systemKey,
    memberCount,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  }
}
