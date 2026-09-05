import type { PermissionGroup, PermissionModule } from '@/types/permission'

export type PermissionRollup = { granted: number; total: number }

export function permissionModuleRollup(
  module: PermissionModule,
  selected: ReadonlySet<string>
): PermissionRollup {
  return {
    granted: module.permissions.filter((permission) =>
      selected.has(permission.value)
    ).length,
    total: module.permissions.length,
  }
}

export function permissionGroupRollup(
  group: PermissionGroup,
  selected: ReadonlySet<string>
): PermissionRollup {
  return group.modules.reduce<PermissionRollup>(
    (rollup, module) => {
      const moduleRollup = permissionModuleRollup(module, selected)
      return {
        granted: rollup.granted + moduleRollup.granted,
        total: rollup.total + moduleRollup.total,
      }
    },
    { granted: 0, total: 0 }
  )
}

export function setPermissionGroupSelection(
  group: PermissionGroup,
  selected: ReadonlySet<string>,
  grant: boolean
): Set<string> {
  const next = new Set(selected)

  for (const permissionModule of group.modules) {
    for (const permission of permissionModule.permissions) {
      if (grant) next.add(permission.value)
      else next.delete(permission.value)
    }
  }

  return next
}
