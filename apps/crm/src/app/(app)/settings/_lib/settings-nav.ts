import type { SettingsHubGroup } from '@876/ui/settings-hub'

export const SETTINGS_GROUPS: SettingsHubGroup[] = [
  {
    label: 'Workspace',
    items: [
      {
        label: 'Teams',
        icon: 'teams',
        availability: 'available',
        href: '/settings/teams',
      },
      {
        label: 'Categories',
        icon: 'categories',
        availability: 'available',
        href: '/settings/categories',
      },
    ],
  },
  {
    label: 'Requests',
    items: [
      {
        label: 'Priorities',
        icon: 'priorities',
        availability: 'available',
        href: '/settings/priorities',
      },
      {
        label: 'Statuses',
        icon: 'statuses',
        availability: 'planned',
      },
      {
        label: 'Automation rules',
        icon: 'automation',
        availability: 'planned',
      },
      {
        label: 'Email intake',
        icon: 'email',
        availability: 'planned',
      },
    ],
  },
  {
    label: 'Organization',
    items: [
      {
        label: 'Users',
        icon: 'members',
        availability: 'available',
        href: '/settings/users',
      },
      {
        label: 'Preferences',
        icon: 'preferences',
        availability: 'planned',
      },
    ],
  },
]
