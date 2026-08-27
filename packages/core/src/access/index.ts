import type {
  AppPermission,
  AppPermissionCatalog,
  AppPermissionCatalogDefinition,
  EffectivePermissionInput,
  GroupedAppPermissions,
} from './types'

export type {
  AppMembershipProfile,
  AppPermission,
  AppPermissionCatalog,
  AppPermissionCatalogDefinition,
  AppPermissionCatalogModule,
  AppPermissionDefinition,
  AppPermissionModuleDefinition,
  AppRole,
  EffectivePermissionInput,
  GroupedAppPermissions,
} from './types'

const KEY_PART = /^[a-z][a-z0-9_]*$/
const APP_SLUG = /^876-[a-z][a-z0-9-]*$/

function assertKeyPart(value: string, field: string): void {
  if (!KEY_PART.test(value))
    throw new TypeError(`${field} must use lowercase letters, digits, or underscores.`)
}

function assertLabel(value: string, field: string): void {
  const length = value.trim().length
  if (length < 1 || length > 120 || value.includes('\u0000'))
    throw new TypeError(`${field} must be a safe non-empty label.`)
}

function permissionRows(
  definition: AppPermissionCatalogDefinition
): AppPermission[] {
  const rows: AppPermission[] = []
  const seen = new Set<string>()

  for (const module of definition.modules) {
    assertKeyPart(module.key, 'Module key')
    assertLabel(module.label, 'Module label')

    for (const permission of module.permissions) {
      assertKeyPart(permission.action, 'Permission action')
      assertLabel(permission.label, 'Permission label')
      const key = `${module.key}.${permission.action}`
      if (seen.has(key)) throw new TypeError(`Duplicate app permission: ${key}.`)
      seen.add(key)
      rows.push({
        key,
        moduleKey: module.key,
        action: permission.action,
        label: permission.label.trim(),
        description: permission.description?.trim() || null,
        isDangerous: permission.isDangerous ?? false,
        position: permission.position ?? 0,
      })
    }
  }

  return rows
}

/** Defines and validates a product app's stable permission catalog. */
export function defineAppPermissionCatalog(
  definition: AppPermissionCatalogDefinition
): AppPermissionCatalog {
  if (!APP_SLUG.test(definition.app))
    throw new TypeError('App must be a stable 876 app slug.')

  const moduleKeys = new Set<string>()
  for (const module of definition.modules) {
    if (moduleKeys.has(module.key))
      throw new TypeError(`Duplicate app permission module: ${module.key}.`)
    moduleKeys.add(module.key)
  }

  const permissions = permissionRows(definition)
  const byModule = new Map<string, AppPermission[]>()
  for (const permission of permissions) {
    const rows = byModule.get(permission.moduleKey) ?? []
    rows.push(permission)
    byModule.set(permission.moduleKey, rows)
  }

  return {
    app: definition.app,
    modules: definition.modules
      .map((module) => ({
        key: module.key,
        label: module.label.trim(),
        position: module.position ?? 0,
        permissions: [...(byModule.get(module.key) ?? [])].sort(
          (left, right) =>
            (left.position ?? 0) - (right.position ?? 0) ||
            left.key.localeCompare(right.key)
        ),
      }))
      .sort(
        (left, right) =>
          left.position - right.position || left.key.localeCompare(right.key)
      ),
    permissions: [...permissions].sort((left, right) => left.key.localeCompare(right.key)),
  }
}

function stringSet(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set()
  return new Set(value.filter((item): item is string => typeof item === 'string'))
}

function catalogPermissions(
  catalog: AppPermissionCatalog | readonly AppPermission[]
): readonly AppPermission[] {
  if (Array.isArray(catalog)) return catalog
  if (
    typeof catalog === 'object' &&
    catalog !== null &&
    'permissions' in catalog &&
    Array.isArray(catalog.permissions)
  )
    return catalog.permissions
  return []
}

/** Combines role permissions and overrides and intersects with the live catalog. */
export function resolveEffectivePermissions(
  input: EffectivePermissionInput
): string[] {
  try {
    const catalog = new Set(
      catalogPermissions(input.catalog)
        .map((permission) => permission?.key)
        .filter((key): key is string => typeof key === 'string')
    )
    const rolePermissions = stringSet(input.role?.permissions)
    const grants = stringSet(input.grants)
    const denies = stringSet(input.denies)

    for (const grant of grants) rolePermissions.add(grant)
    for (const deny of denies) rolePermissions.delete(deny)

    return [...rolePermissions]
      .filter((permission) => catalog.has(permission))
      .sort()
  } catch {
    return []
  }
}

/** Returns whether the effective permission set contains a key. */
export function hasPermission(
  effective: readonly string[] | null | undefined,
  permission: string
): boolean {
  return Array.isArray(effective) && effective.includes(permission)
}

/** Groups a catalog for permission-editor and permission-summary UIs. */
export function groupByModule(
  catalog: AppPermissionCatalog,
  effective: readonly string[] | null | undefined
): GroupedAppPermissions[] {
  const granted = stringSet(effective)
  return catalog.modules.map((module) => ({
    key: module.key,
    label: module.label,
    position: module.position,
    permissions: module.permissions.map((permission) => ({
      ...permission,
      granted: granted.has(permission.key),
    })),
  }))
}
