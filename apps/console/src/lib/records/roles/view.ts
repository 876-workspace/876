import type { RoleView } from '@/types/role'

export function toRoleView(
  row: {
    name: string
    displayName: string
    description: string
    permissions: string[]
    isSystem: boolean
  },
  userCount: number
): RoleView {
  return {
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    permissions: row.permissions,
    isSystem: row.isSystem,
    userCount,
  }
}
