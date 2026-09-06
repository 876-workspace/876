import type { SettingsHubGroup, SettingsHubItem } from '@876/ui/settings-hub'

import { INVOICE_MODULE_CATALOG } from '@/lib/modules'

export const ROLES_READ_PERMISSION = 'roles:read'

export type InvoiceSettingsHubItem = SettingsHubItem & {
  requires?: { permission: string }
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
      { label: 'Templates', icon: 'templates', availability: 'planned' },
      { label: 'Numbering', icon: 'documents', availability: 'planned' },
    ],
  },
  {
    label: 'Money',
    items: [
      { label: 'Payment modes', icon: 'payments', availability: 'planned' },
      { label: 'Taxes', icon: 'taxes', availability: 'planned' },
    ],
  },
]
