import { defineAppPermissionCatalog } from './index'
import type { AppPermission, AppPermissionCatalog } from './types'

/**
 * Canonical app permission catalogs.
 *
 * These are the single definition of each product app's permission vocabulary.
 * The identity API seeds `app_permissions` from them and every product app
 * resolves guards against them, so a permission exists in exactly one place.
 * Copying a catalog into an app or into the seeds reintroduces the drift this
 * module exists to prevent — import from here instead.
 *
 * A key is a permanent identifier: renaming one orphans every stored role and
 * assignment that references it.
 */

type ModuleDraft = {
  key: string
  label: string
  actions: readonly string[]
}

/**
 * Positions are assigned from declaration order, so the order a catalog is
 * written in is the order a permission matrix renders in. Without them every
 * module and permission defaults to position 0 and sorts alphabetically.
 */
function modules(drafts: readonly ModuleDraft[]) {
  return drafts.map((draft, moduleIndex) => ({
    key: draft.key,
    label: draft.label,
    position: moduleIndex,
    permissions: draft.actions.map((action, actionIndex) => ({
      action,
      label: `${titleCase(action)} ${draft.label}`,
      isDangerous: action === 'delete' || action === 'danger_zone',
      position: actionIndex,
    })),
  }))
}

const CRUD = ['view', 'create', 'edit', 'delete'] as const

function crud(
  key: string,
  label: string,
  extra: readonly string[] = []
): ModuleDraft {
  return { key, label, actions: [...CRUD, ...extra] }
}

function titleCase(value: string): string {
  return value
    .split('_')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function withConsoleKey(permission: AppPermission): AppPermission {
  return {
    ...permission,
    key: `${permission.moduleKey}:${permission.action}`,
  }
}

/**
 * Narrows persisted Console role permissions to usable string keys.
 *
 * Stored role rows are JSON, so a malformed or partially-written value can
 * reach this path at runtime even though the type says `string[]`. Filtering
 * here keeps a bad row from throwing during authorization; the catalog
 * intersection downstream still decides what the keys actually grant.
 */
export function toStoredPermissionKeys(permissions: unknown): string[] {
  if (!Array.isArray(permissions)) return []

  return permissions.filter(
    (permission): permission is string => typeof permission === 'string'
  )
}

/**
 * Console predates product-app catalogs and already persists colon-delimited
 * permission identifiers (`users:read`, `console:access`). The generic catalog
 * builder deliberately remains dot-delimited for product apps, so Console is
 * adapted after validation instead of changing either persisted vocabulary.
 *
 * Console's real app slug is also `console`, while the generic builder validates
 * product slugs as `876-*`. The compatibility adapter keeps that exception here,
 * next to the only catalog that needs it.
 */
function defineConsolePermissionCatalog(): AppPermissionCatalog {
  const catalog = defineAppPermissionCatalog({
    app: '876-console',
    modules: modules([
      {
        key: 'console',
        label: 'Console',
        actions: [
          'access',
          'requests',
          'settings',
          'billing',
          'users',
          'organizations',
          'apps',
          'features',
          'widgets',
          'storage',
          'security',
          'reports',
          'danger_zone',
        ],
      },
      {
        key: 'users',
        label: 'Users',
        actions: ['read', 'list', 'search', 'create', 'update', 'delete'],
      },
      {
        key: 'organizations',
        label: 'Organizations',
        actions: ['read', 'list', 'search', 'create', 'update', 'delete'],
      },
      {
        key: 'memberships',
        label: 'Memberships',
        actions: ['read', 'list', 'create', 'update', 'delete'],
      },
      {
        key: 'apps',
        label: 'Apps',
        actions: ['read', 'list', 'create', 'update', 'delete'],
      },
      {
        key: 'roles',
        label: 'Roles',
        actions: ['read', 'list', 'create', 'update', 'delete'],
      },
      {
        key: 'team',
        label: 'Team',
        actions: ['read', 'list', 'invite', 'update', 'suspend', 'revoke'],
      },
    ]),
  })

  return {
    app: 'console',
    modules: catalog.modules.map((module) => ({
      ...module,
      permissions: module.permissions.map(withConsoleKey),
    })),
    permissions: catalog.permissions
      .map(withConsoleKey)
      .sort((left, right) => left.key.localeCompare(right.key)),
  }
}

export const consolePermissionCatalog = defineConsolePermissionCatalog()

export const couriersPermissionCatalog: AppPermissionCatalog =
  defineAppPermissionCatalog({
    app: '876-couriers',
    modules: modules([
      crud('items', 'Items'),
      crud('customers', 'Customers', ['import', 'export']),
      crud('packages', 'Packages', ['export']),
      crud('pre_alerts', 'Pre-alerts'),
      crud('warehouse', 'Warehouse'),
      crud('manifests', 'Manifests'),
      crud('deliveries', 'Deliveries'),
      crud('invoices', 'Invoices'),
      crud('payments', 'Payments'),
      { key: 'reports', label: 'Reports', actions: ['view'] },
      { key: 'settings', label: 'Settings', actions: ['view', 'edit'] },
    ]),
  })

export const crmPermissionCatalog: AppPermissionCatalog =
  defineAppPermissionCatalog({
    app: '876-crm',
    modules: modules([
      crud('requests', 'Requests'),
      crud('customers', 'Customers'),
      crud('tasks', 'Tasks'),
      crud('reminders', 'Reminders'),
      crud('notes', 'Notes'),
      crud('teams', 'Teams'),
      crud('categories', 'Categories'),
      crud('priorities', 'Priorities'),
      crud('request_forms', 'Request forms'),
      { key: 'reports', label: 'Reports', actions: ['view'] },
      { key: 'settings', label: 'Settings', actions: ['view', 'edit'] },
    ]),
  })

/** Every canonical catalog, keyed by the app slug that owns it. */
export const appPermissionCatalogs: Record<string, AppPermissionCatalog> = {
  console: consolePermissionCatalog,
  '876-couriers': couriersPermissionCatalog,
  '876-crm': crmPermissionCatalog,
}
