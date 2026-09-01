import type { AppPermissionCatalog } from '@876/core/access'
import {
  couriersPermissionCatalog,
  crmPermissionCatalog,
} from '@876/core/access/catalogs'

import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

import * as repository from './app-access.repository'

export type AppPermissionSeed = {
  key: string
  moduleKey: string
  action: string
  label: string
  description: string | null
  isDangerous: boolean
  position: number
}

export type AppRoleSeed = {
  key: string
  name: string
  description: string
  permissions: string[]
  isSystem: boolean
  isDefault: boolean
  position: number
}

type AppAccessSeedDefinition = {
  appSlug: string
  permissions: AppPermissionSeed[]
  roles: AppRoleSeed[]
}

function title(value: string): string {
  return value
    .split('-')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function catalog(
  modules: Array<{ key: string; actions: string[] }>
): AppPermissionSeed[] {
  let position = 0
  return modules.flatMap((module) =>
    module.actions.map((action) => ({
      key: `${module.key}.${action}`,
      moduleKey: module.key,
      action,
      label: `${title(action)} ${title(module.key)}`,
      description: null,
      isDangerous: action === 'delete',
      position: position++,
    }))
  )
}

/** Adapts a canonical `@876/core/access` catalog to the seed row shape. */
function fromCatalog(source: AppPermissionCatalog): AppPermissionSeed[] {
  let position = 0
  return source.modules.flatMap((module) =>
    module.permissions.map((permission) => ({
      key: permission.key,
      moduleKey: permission.moduleKey,
      action: permission.action,
      label: permission.label,
      description: permission.description ?? null,
      isDangerous: permission.isDangerous ?? false,
      position: position++,
    }))
  )
}

function keysFor(
  permissions: readonly AppPermissionSeed[],
  predicate: (permission: AppPermissionSeed) => boolean = () => true
): string[] {
  return permissions.filter(predicate).map((permission) => permission.key)
}

const couriersPermissions = fromCatalog(couriersPermissionCatalog)
const crmPermissions = fromCatalog(crmPermissionCatalog)

const billingPermissions = catalog([
  { key: 'dashboard', actions: ['view'] },
  { key: 'customers', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'catalog', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'sales', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'subscriptions', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'reports', actions: ['view'] },
  { key: 'currencies', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'taxes', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'vendors', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'purchases', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'banking', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'payments', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'settings', actions: ['view', 'edit'] },
])

const invoicePermissions = catalog([
  { key: 'dashboard', actions: ['view'] },
  { key: 'customers', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'items', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'invoices', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { key: 'estimates', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { key: 'payments', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'reports', actions: ['view'] },
  { key: 'settings', actions: ['view', 'edit'] },
])

function viewerPermissions(
  permissions: readonly AppPermissionSeed[]
): string[] {
  return keysFor(permissions, (permission) => permission.action === 'view')
}

function standardRoles(permissions: AppPermissionSeed[]): AppRoleSeed[] {
  return [
    {
      key: 'super-admin',
      name: 'Super Admin',
      description: 'Full access to this application.',
      permissions: keysFor(permissions),
      isSystem: true,
      isDefault: false,
      position: 0,
    },
    {
      key: 'admin',
      name: 'Admin',
      description:
        'Administrative and operational access without destructive actions.',
      permissions: keysFor(
        permissions,
        (permission) => !permission.isDangerous
      ),
      isSystem: true,
      isDefault: false,
      position: 10,
    },
    {
      key: 'staff',
      name: 'Staff',
      description: 'Read-only access to this application.',
      permissions: viewerPermissions(permissions),
      isSystem: true,
      isDefault: true,
      position: 20,
    },
  ]
}

export const APP_ACCESS_SEED_DEFINITIONS: readonly AppAccessSeedDefinition[] = [
  {
    appSlug: '876-couriers',
    permissions: couriersPermissions,
    roles: standardRoles(couriersPermissions),
  },
  {
    appSlug: '876-crm',
    permissions: crmPermissions,
    roles: standardRoles(crmPermissions),
  },
  {
    appSlug: '876-billing',
    permissions: billingPermissions,
    roles: standardRoles(billingPermissions),
  },
  {
    appSlug: '876-invoice',
    permissions: invoicePermissions,
    roles: standardRoles(invoicePermissions),
  },
] as const

export async function seedAppAccess(): Promise<{
  apps: number
  permissionsCreated: number
  permissionsUpdated: number
  rolesCreated: number
  rolesUpdated: number
  skippedApps: string[]
}> {
  const now = BigInt(nowUnixSeconds())
  let apps = 0
  let permissionsCreated = 0
  let permissionsUpdated = 0
  let rolesCreated = 0
  let rolesUpdated = 0
  const skippedApps: string[] = []

  for (const definition of APP_ACCESS_SEED_DEFINITIONS) {
    if (definition.appSlug === '876-enterprise') continue
    const app = await repository.findAppBySlug(definition.appSlug)
    if (!app) {
      skippedApps.push(definition.appSlug)
      continue
    }

    const defaults = definition.roles.filter((role) => role.isDefault)
    if (defaults.length !== 1)
      throw new Error(
        `${definition.appSlug} app access seed must define exactly one default role.`
      )

    apps += 1
    for (const permission of definition.permissions) {
      const result = await repository.upsertPermission({
        id: generateId('permission'),
        appId: app.id,
        ...permission,
        now,
      })
      if (result === 'created') permissionsCreated += 1
      else permissionsUpdated += 1
    }

    for (const role of definition.roles) {
      const result = await repository.upsertTemplateRole({
        id: generateId('role'),
        appId: app.id,
        ...role,
        now,
      })
      if (result === 'created') rolesCreated += 1
      else rolesUpdated += 1
    }
    await repository.setTemplateDefault(app.id, defaults[0]!.key, now)
  }

  return {
    apps,
    permissionsCreated,
    permissionsUpdated,
    rolesCreated,
    rolesUpdated,
    skippedApps,
  }
}
