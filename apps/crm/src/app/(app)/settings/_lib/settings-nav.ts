export type SettingsIconKey =
  | 'automation'
  | 'categories'
  | 'email'
  | 'members'
  | 'preferences'
  | 'priorities'
  | 'statuses'
  | 'teams'

export type SettingsNavItem = {
  label: string
  icon: SettingsIconKey
  availability: 'available' | 'planned'
  href?: string
}

export type SettingsNavGroup = {
  label: string
  items: SettingsNavItem[]
}

export const SETTINGS_GROUPS: SettingsNavGroup[] = [
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
      { label: 'Statuses', icon: 'statuses', availability: 'planned' },
      {
        label: 'Automation rules',
        icon: 'automation',
        availability: 'planned',
      },
      { label: 'Email intake', icon: 'email', availability: 'planned' },
    ],
  },
  {
    label: 'Organization',
    items: [
      { label: 'Members', icon: 'members', availability: 'planned' },
      {
        label: 'Preferences',
        icon: 'preferences',
        availability: 'planned',
      },
    ],
  },
]
