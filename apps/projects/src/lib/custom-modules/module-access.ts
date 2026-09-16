import type { NavGroupDefinition } from '@876/core/access'
import type {
  CustomModule,
  CustomModuleField,
} from '@876/projects/contracts'

export const MODULE_KEY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

export function isValidModuleKey(value: string): boolean {
  return MODULE_KEY_PATTERN.test(value)
}

export function customModuleLayoutEntity(moduleKey: string): string {
  return `custom-module:${moduleKey}`
}

export function keyFromName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * The caller's effective app role keys are the resolved access permissions.
 * They travel to the owning service in `x-app-role-keys`, resolved here on
 * the server — the browser never names them.
 */
export function callerRoleKeys(permissions: readonly string[]): string[] {
  return permissions.filter((permission) => permission.trim() !== '')
}

export function roleKeysHeaderValue(roleKeys: readonly string[]): string {
  return roleKeys.map((key) => key.trim()).filter((key) => key !== '').join(',')
}

export function hasModuleAccess(
  restrictedToRoleKeys: readonly string[],
  callerKeys: readonly string[]
): boolean {
  if (restrictedToRoleKeys.length === 0) return true
  const caller = new Set(callerKeys)
  return restrictedToRoleKeys.some((key) => caller.has(key))
}

export function visibleModules(
  modules: readonly CustomModule[],
  callerKeys: readonly string[]
): CustomModule[] {
  return modules.filter((module) =>
    hasModuleAccess(module.restrictedToRoleKeys, callerKeys)
  )
}

export function findModuleByKey(
  modules: readonly CustomModule[],
  moduleKey: string
): CustomModule | null {
  return modules.find((module) => module.key === moduleKey) ?? null
}

export function orgScopeModules(modules: readonly CustomModule[]): CustomModule[] {
  return modules.filter((module) => module.scope === 'org')
}

export function projectScopeModules(
  modules: readonly CustomModule[],
  projectId: string
): CustomModule[] {
  return modules.filter(
    (module) =>
      module.scope === 'project' &&
      (module.projectId === null || module.projectId === projectId)
  )
}

/**
 * Server-resolved sidebar entries for org-scope modules. Plain data with icon
 * keys only — the shell resolves the icon components client-side.
 */
export function resolveCustomModuleNavEntries(
  modules: readonly Pick<CustomModule, 'key' | 'pluralName' | 'icon'>[]
): NavGroupDefinition {
  return {
    key: 'custom-modules',
    entries: modules.map((module) => ({
      key: `custom-module-${module.key}`,
      title: module.pluralName,
      href: `/m/${module.key}`,
      icon: module.icon ?? 'forms',
      requires: { permission: 'projects.view' as const },
    })),
  }
}

export function defaultStatusKey(
  statuses: readonly { key: string; isDefault: boolean }[]
): string {
  return statuses.find((status) => status.isDefault)?.key ?? statuses[0]?.key ?? 'open'
}

export function statusLabelFor(
  statuses: readonly { key: string; label: string }[],
  statusKey: string
): string {
  return statuses.find((status) => status.key === statusKey)?.label ?? statusKey
}

export function fieldLabelFor(
  fields: readonly Pick<CustomModuleField, 'key' | 'label'>[],
  fieldKey: string
): string {
  return fields.find((field) => field.key === fieldKey)?.label ?? fieldKey
}
