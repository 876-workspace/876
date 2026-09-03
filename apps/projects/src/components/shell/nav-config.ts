import { defineNavigation } from '@876/core/access'

/** Projects navigation is resolved on the server before it crosses into the shell. */
export const navConfig = defineNavigation([
  {
    key: 'workspace',
    entries: [
      {
        key: 'dashboard',
        title: 'Dashboard',
        href: '/',
        icon: 'dashboard',
        colorClassName: 'text-blue-500 dark:text-blue-400',
        requires: { permission: 'dashboard.view' },
      },
    ],
  },
  {
    key: 'configuration',
    entries: [
      {
        key: 'members',
        title: 'Members',
        href: '/settings/users',
        icon: 'teams',
        colorClassName: 'text-indigo-500 dark:text-indigo-400',
        requires: { permission: 'members.view' },
      },
    ],
  },
  {
    key: 'settings',
    entries: [
      {
        key: 'settings',
        title: 'Settings',
        href: '/settings',
        icon: 'settings',
        colorClassName: 'text-slate-500 dark:text-slate-400',
        requires: { permission: 'settings.view' },
      },
    ],
  },
])
