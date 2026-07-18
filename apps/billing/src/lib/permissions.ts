import type { Permission, RoleCreateParams } from '@/types/access'
import { BILLING_PERMISSION_VALUES } from '@/types/permission-values'
import type { PermissionGroup } from '@/types/permission'

const ALL_PERMISSIONS: Permission[] = [...BILLING_PERMISSION_VALUES]

const PERMISSION_SET = new Set<string>(BILLING_PERMISSION_VALUES)

export function isPermission(value: string): value is Permission {
  return PERMISSION_SET.has(value)
}

/** Applies read/write dependency rules used by the role permission editor. */
export function togglePermission(
  current: ReadonlySet<Permission>,
  permission: Permission
): Set<Permission> {
  const next = new Set(current)
  if (next.has(permission)) {
    if (permission === 'billing:access') return next
    next.delete(permission)
    if (permission.endsWith(':read'))
      next.delete(permission.replace(/:read$/, ':write') as Permission)
    return next
  }

  next.add(permission)
  if (permission.endsWith(':write'))
    next.add(permission.replace(/:write$/, ':read') as Permission)
  return next
}

export const BILLING_SYSTEM_ROLES: Array<
  RoleCreateParams & { isDefault: boolean }
> = [
  {
    slug: 'owner',
    name: 'Owner',
    description:
      'Unrestricted workspace access, including roles and member grants.',
    permissions: ALL_PERMISSIONS,
    isDefault: false,
  },
  {
    slug: 'admin',
    name: 'Administrator',
    description:
      'Full operational and settings access for the Billing workspace.',
    permissions: ALL_PERMISSIONS,
    isDefault: false,
  },
  {
    slug: 'accountant',
    name: 'Accountant',
    description:
      'Manages customers, sales, tax configuration, and financial reports.',
    permissions: [
      'billing:access',
      'dashboard:read',
      'customers:read',
      'customers:write',
      'catalog:read',
      'sales:read',
      'sales:write',
      'subscriptions:read',
      'reports:read',
      'settings:read',
      'currencies:read',
      'taxes:read',
      'taxes:write',
      'vendors:read',
      'vendors:write',
      'purchases:read',
      'purchases:write',
      'banking:read',
      'banking:write',
      'payments:read',
      'payments:write',
      'members:read',
      'roles:read',
    ],
    isDefault: false,
  },
  {
    slug: 'viewer',
    name: 'Viewer',
    description:
      'Read-only access to Billing data and workspace configuration.',
    permissions: [
      'billing:access',
      'dashboard:read',
      'customers:read',
      'catalog:read',
      'sales:read',
      'subscriptions:read',
      'reports:read',
      'settings:read',
      'currencies:read',
      'taxes:read',
      'vendors:read',
      'purchases:read',
      'banking:read',
      'payments:read',
      'members:read',
      'roles:read',
    ],
    isDefault: true,
  },
]

export const BILLING_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: 'Workspace',
    permissions: [
      {
        value: 'billing:access',
        label: 'Access Billing',
        description: 'Enter this Billing workspace.',
      },
      {
        value: 'dashboard:read',
        label: 'View dashboard',
        description: 'View workspace summaries and key metrics.',
      },
      {
        value: 'reports:read',
        label: 'View reports',
        description: 'View commercial reports and totals.',
      },
      {
        value: 'settings:read',
        label: 'View settings',
        description: 'Open workspace configuration pages.',
      },
    ],
  },
  resourceGroup('Customers', 'customers'),
  resourceGroup('Catalogue', 'catalog'),
  resourceGroup('Sales', 'sales'),
  resourceGroup('Subscriptions', 'subscriptions'),
  resourceGroup('Currencies', 'currencies'),
  resourceGroup('Taxes', 'taxes'),
  resourceGroup('Vendors', 'vendors'),
  resourceGroup('Purchases', 'purchases'),
  resourceGroup('Banking', 'banking'),
  resourceGroup('Payments', 'payments'),
  resourceGroup('Members', 'members'),
  resourceGroup('Roles', 'roles'),
]

function resourceGroup(
  label: string,
  resource:
    | 'customers'
    | 'catalog'
    | 'sales'
    | 'subscriptions'
    | 'currencies'
    | 'taxes'
    | 'vendors'
    | 'purchases'
    | 'banking'
    | 'payments'
    | 'members'
    | 'roles'
): PermissionGroup {
  return {
    label,
    permissions: [
      {
        value: `${resource}:read`,
        label: `View ${label.toLowerCase()}`,
        description: `Read ${label.toLowerCase()} data.`,
      },
      {
        value: `${resource}:write`,
        label: `Manage ${label.toLowerCase()}`,
        description: `Create and update ${label.toLowerCase()} data.`,
      },
    ],
  }
}
