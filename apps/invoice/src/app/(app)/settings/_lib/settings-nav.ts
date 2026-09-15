import type { SettingsHubGroup, SettingsHubItem } from '@876/ui/settings-hub'

import { INVOICE_MODULE_CATALOG } from '@/lib/modules'

export const ROLES_READ_PERMISSION = 'roles:read'
export const SALES_READ_PERMISSION = 'sales:read'

/** Any one of these grants access to the combined finance settings page. */
export const FINANCE_READ_PERMISSIONS = [
  'currencies:read',
  'payments:read',
  'taxes:read',
] as const

export type InvoiceSettingsHubItem = SettingsHubItem & {
  requires?: { permission?: string; anyPermission?: readonly string[] }
}
export type InvoiceSettingsHubGroup = Omit<SettingsHubGroup, 'items'> & {
  items: InvoiceSettingsHubItem[]
}

export const SETTINGS_GROUPS: InvoiceSettingsHubGroup[] = [
  {
    label: 'Workspace',
    items: [
      {
        label: 'Users',
        icon: 'members',
        availability: 'available',
        href: '/settings/users',
      },
      {
        label: 'Roles',
        icon: 'roles',
        availability: 'available',
        href: '/settings/roles',
        requires: { permission: ROLES_READ_PERMISSION },
      },
      { label: 'Preferences', icon: 'preferences', availability: 'planned' },
      {
        label: 'Branding',
        icon: 'preferences',
        availability: 'available',
        href: '/settings/branding',
        requires: { permission: SALES_READ_PERMISSION },
      },
    ],
  },
  {
    label: 'Modules',
    items: INVOICE_MODULE_CATALOG.map((module) => ({
      label: `${module.label} settings`,
      icon: 'preferences',
      availability: 'available' as const,
      href: `/settings/modules/${module.key}`,
    })),
  },
  {
    label: 'Sales',
    items: [
      {
        label: 'Templates',
        icon: 'templates',
        availability: 'available',
        href: '/settings/templates',
        requires: { permission: SALES_READ_PERMISSION },
      },
      { label: 'Numbering', icon: 'documents', availability: 'planned' },
    ],
  },
  {
    label: 'Money',
    items: [
      {
        label: 'Finance',
        icon: 'payments',
        availability: 'available',
        href: '/settings/finance',
        requires: { anyPermission: FINANCE_READ_PERMISSIONS },
      },
    ],
  },
]

/**
 * Invoice condenses currencies, payment modes, and taxes onto one tabbed page,
 * so the door opens for any one of the three reads. The route renders only the
 * tabs the viewer may actually read.
 */
export function isSettingsItemVisible(
  item: InvoiceSettingsHubItem,
  permissions: readonly string[]
): boolean {
  const requires = item.requires
  if (!requires) return true
  if (requires.permission && !permissions.includes(requires.permission))
    return false
  if (
    requires.anyPermission &&
    !requires.anyPermission.some((permission) =>
      permissions.includes(permission)
    )
  )
    return false

  return true
}
