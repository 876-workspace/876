import type { SettingsHubGroup } from '@876/ui/settings-hub'

import { INVOICE_MODULE_CATALOG } from '@/lib/modules'

export const SETTINGS_GROUPS: SettingsHubGroup[] = [
  {
    label: 'Workspace',
    items: [
      {
        label: 'Users',
        icon: 'members',
        availability: 'available',
        href: '/settings/users',
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
