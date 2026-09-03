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
      {
        key: 'projects',
        title: 'Projects',
        href: '/projects',
        icon: 'requests',
        colorClassName: 'text-purple-500 dark:text-purple-400',
        requires: { permission: 'projects.view' },
      },
      {
        key: 'issues',
        title: 'Issues',
        href: '/issues',
        icon: 'requests',
        colorClassName: 'text-amber-500 dark:text-amber-400',
        requires: { permission: 'issues.view' },
      },
      {
        key: 'board',
        title: 'Board',
        href: '/board',
        icon: 'categories',
        colorClassName: 'text-teal-500 dark:text-teal-400',
        requires: { permission: 'issues.view' },
      },
    ],
  },
  {
    key: 'configuration',
    entries: [
      {
        key: 'labels',
        title: 'Labels',
        href: '/labels',
        icon: 'categories',
        colorClassName: 'text-rose-500 dark:text-rose-400',
        requires: { permission: 'labels.view' },
      },
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
