import type {
  DefaultRoleKey,
  PermissionCatalog,
  PermissionModule,
} from '@/types/permissions'

export const PERMISSION_CATALOG: PermissionCatalog = [
  {
    key: 'items',
    label: 'Items',
    actions: ['view', 'create', 'edit', 'delete'],
    extras: [],
  },
  {
    key: 'customers',
    label: 'Customers',
    actions: ['view', 'create', 'edit', 'delete'],
    extras: [
      { key: 'import', label: 'Import customers' },
      { key: 'export', label: 'Export customers' },
    ],
  },
  {
    key: 'packages',
    label: 'Packages',
    actions: ['view', 'create', 'edit', 'delete'],
    extras: [{ key: 'export', label: 'Export packages' }],
  },
  {
    key: 'pre_alerts',
    label: 'Pre-alerts',
    actions: ['view', 'create', 'edit', 'delete'],
    extras: [],
  },
  {
    key: 'warehouse',
    label: 'Warehouse',
    actions: ['view', 'create', 'edit', 'delete'],
    extras: [],
  },
  {
    key: 'manifests',
    label: 'Manifests',
    actions: ['view', 'create', 'edit', 'delete'],
    extras: [],
  },
  {
    key: 'deliveries',
    label: 'Deliveries',
    actions: ['view', 'create', 'edit', 'delete'],
    extras: [],
  },
  {
    key: 'invoices',
    label: 'Invoices',
    actions: ['view', 'create', 'edit', 'delete'],
    extras: [],
  },
  {
    key: 'payments',
    label: 'Payments',
    actions: ['view', 'create', 'edit', 'delete'],
    extras: [],
  },
  {
    key: 'reports',
    label: 'Reports',
    actions: ['view'],
    extras: [],
  },
  {
    key: 'settings',
    label: 'Settings',
    actions: ['view', 'edit'],
    extras: [],
  },
]

export const DEFAULT_ROLE_DEFINITIONS = {
  admin: {
    name: 'Admin',
    description: 'Unrestricted access to every module.',
  },
  staff: {
    name: 'Staff',
    description: 'Access to every module except Reports and Settings.',
  },
} as const satisfies Record<
  DefaultRoleKey,
  { name: string; description: string }
>

export function permissionKey(moduleKey: string, action: string): string {
  return `${moduleKey}.${action}`
}

export function modulePermissionKeys(module: PermissionModule): string[] {
  return [
    ...module.actions.map((action) => permissionKey(module.key, action)),
    ...module.extras.map((extra) => permissionKey(module.key, extra.key)),
  ]
}

export function allPermissionKeys(catalog: PermissionCatalog): string[] {
  return catalog.flatMap(modulePermissionKeys)
}

export function isValidPermissionKey(
  catalog: PermissionCatalog,
  key: string
): boolean {
  return catalog.some((module) => modulePermissionKeys(module).includes(key))
}

export function defaultRolePermissions(
  catalog: PermissionCatalog,
  systemKey: DefaultRoleKey
): string[] {
  const modules =
    systemKey === 'staff'
      ? catalog.filter(
          (module) => module.key !== 'reports' && module.key !== 'settings'
        )
      : catalog

  return allPermissionKeys(modules)
}

export function resolveRolePermissions(role: {
  systemKey: string | null
  permissions: unknown
}): string[] {
  if (role.systemKey === 'admin' || role.systemKey === 'staff')
    return defaultRolePermissions(PERMISSION_CATALOG, role.systemKey)

  if (
    !Array.isArray(role.permissions) ||
    !role.permissions.every((key) => typeof key === 'string')
  )
    return []

  return role.permissions.filter((key) =>
    isValidPermissionKey(PERMISSION_CATALOG, key)
  )
}
