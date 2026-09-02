import type { SettingsHubGroup } from '@876/ui/settings-hub'

export const SETTINGS_GROUPS: SettingsHubGroup[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Users', icon: 'members', availability: 'planned' },
      { label: 'Preferences', icon: 'preferences', availability: 'planned' },
    ],
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
