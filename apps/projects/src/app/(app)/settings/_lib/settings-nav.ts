import type { SettingsHubGroup } from '@876/ui/settings-hub'

export const SETTINGS_GROUPS: SettingsHubGroup[] = [
  {
    label: 'Workspace',
    items: [
      {
        label: 'Work item types',
        icon: 'categories',
        availability: 'available',
        href: '/settings/work-item-types',
      },
      {
        label: 'Workflow states',
        icon: 'statuses',
        availability: 'available',
        href: '/settings/workflow-states',
      },
      {
        label: 'Workflows',
        icon: 'statuses',
        availability: 'available',
        href: '/settings/workflows',
      },
      {
        label: 'Custom fields',
        icon: 'preferences',
        availability: 'available',
        href: '/settings/custom-fields',
      },
      {
        label: 'Phase fields',
        icon: 'priorities',
        availability: 'available',
        href: '/settings/phase-fields',
      },
      {
        label: 'Project fields',
        icon: 'preferences',
        availability: 'available',
        href: '/settings/project-fields',
      },
      {
        label: 'Layouts',
        icon: 'templates',
        availability: 'available',
        href: '/settings/layouts',
      },
      {
        label: 'Custom modules',
        icon: 'categories',
        availability: 'available',
        href: '/settings/custom-modules',
      },
      {
        label: 'Dashboard',
        icon: 'templates',
        availability: 'available',
        href: '/settings/dashboard',
      },
      {
        label: 'Templates',
        icon: 'templates',
        availability: 'available',
        href: '/settings/templates',
      },
      {
        label: 'Teams',
        icon: 'teams',
        availability: 'planned',
      },
      {
        label: 'Categories',
        icon: 'categories',
        availability: 'planned',
      },
    ],
  },
  {
    label: 'Requests',
    items: [
      {
        label: 'Priorities',
        icon: 'priorities',
        availability: 'planned',
      },
      {
        label: 'Statuses',
        icon: 'statuses',
        availability: 'planned',
      },
      {
        label: 'Automation rules',
        icon: 'automation',
        availability: 'available',
        href: '/settings/automation',
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
        label: 'Capacity',
        icon: 'members',
        availability: 'available',
        href: '/settings/capacity',
      },
      {
        label: 'Preferences',
        icon: 'preferences',
        availability: 'planned',
      },
    ],
  },
]
