import { defineAppPermissionCatalog } from './index'
import type { AppPermissionCatalog } from './types'

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
      crud('teams', 'Teams'),
      crud('categories', 'Categories'),
      { key: 'reports', label: 'Reports', actions: ['view'] },
      { key: 'settings', label: 'Settings', actions: ['view', 'edit'] },
    ]),
  })

/** Every canonical catalog, keyed by the app slug that owns it. */
export const appPermissionCatalogs: Record<string, AppPermissionCatalog> = {
  '876-couriers': couriersPermissionCatalog,
  '876-crm': crmPermissionCatalog,
}
