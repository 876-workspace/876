import { defineNavigation } from '@876/core/access'

/** CRM navigation is resolved on the server before it crosses into the shell. */
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
        requires: { permission: 'requests.view' },
      },
      {
        key: 'requests',
        title: 'Requests',
        href: '/requests',
        icon: 'requests',
        colorClassName: 'text-purple-500 dark:text-purple-400',
        requires: { permission: 'requests.view' },
      },
      {
        key: 'customers',
        title: 'Customers',
        href: '/customers',
        icon: 'customers',
        colorClassName: 'text-amber-500 dark:text-amber-400',
        requires: { permission: 'customers.view' },
      },
      {
        key: 'forms',
        title: 'Forms',
        href: '/forms',
        icon: 'forms',
        colorClassName: 'text-teal-500 dark:text-teal-400',
        requires: { permission: 'request-forms.view' },
      },
    ],
  },
  {
    key: 'configuration',
    entries: [
      {
        key: 'teams',
        title: 'Teams',
        href: '/settings/teams',
        icon: 'teams',
        colorClassName: 'text-indigo-500 dark:text-indigo-400',
        requires: { permission: 'teams.view' },
      },
      {
        key: 'categories',
        title: 'Categories',
        href: '/settings/categories',
        icon: 'categories',
        colorClassName: 'text-rose-500 dark:text-rose-400',
        requires: { permission: 'categories.view' },
      },
      {
        key: 'priorities',
        title: 'Priorities',
        href: '/settings/priorities',
        icon: 'priorities',
        colorClassName: 'text-orange-500 dark:text-orange-400',
        requires: { permission: 'priorities.view' },
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
