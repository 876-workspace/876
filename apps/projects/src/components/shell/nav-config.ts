import { defineNavigation } from '@876/core/access'

/** Projects navigation is resolved on the server before it crosses into the shell. */
export const navConfig = defineNavigation([
  {
    key: 'workspace',
    entries: [
      {
        key: 'dashboard',
        title: 'Home',
        href: '/',
        icon: 'dashboard',
        colorClassName: 'text-blue-500 dark:text-blue-400',
        requires: { permission: 'dashboard.view' },
      },
      {
        key: 'projects',
        title: 'Projects',
        href: '/projects',
        icon: 'projects',
        colorClassName: 'text-purple-500 dark:text-purple-400',
        requires: { module: 'projects', permission: 'projects.view' },
      },
      {
        key: 'phases',
        title: 'Phases',
        href: '/phases',
        icon: 'phases',
        colorClassName: 'text-cyan-500 dark:text-cyan-400',
        requires: { module: 'projects', permission: 'projects.view' },
      },
      {
        key: 'cycles',
        title: 'Cycles',
        href: '/cycles',
        icon: 'cycles',
        colorClassName: 'text-orange-500 dark:text-orange-400',
        requires: { module: 'projects', permission: 'projects.view' },
      },
      {
        key: 'calendar',
        title: 'Calendar',
        href: '/calendar',
        icon: 'calendar',
        colorClassName: 'text-fuchsia-500 dark:text-fuchsia-400',
        requires: { module: 'projects', permission: 'projects.view' },
      },
      {
        key: 'my-work',
        title: 'My Work',
        href: '/my-work',
        icon: 'my-work',
        colorClassName: 'text-emerald-500 dark:text-emerald-400',
        requires: { module: 'projects', permission: 'projects.view' },
      },
      {
        key: 'time',
        title: 'Time',
        href: '/time',
        icon: 'time',
        colorClassName: 'text-lime-500 dark:text-lime-400',
        requires: { module: 'projects', permission: 'projects.view' },
      },
      {
        key: 'issues',
        title: 'Issues',
        href: '/issues',
        icon: 'issues',
        colorClassName: 'text-amber-500 dark:text-amber-400',
        requires: { module: 'issues', permission: 'issues.view' },
      },
      {
        key: 'board',
        title: 'Board',
        href: '/board',
        icon: 'board',
        colorClassName: 'text-teal-500 dark:text-teal-400',
        requires: { module: 'issues', permission: 'issues.view' },
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
        icon: 'labels',
        colorClassName: 'text-rose-500 dark:text-rose-400',
        requires: { module: 'issues', permission: 'labels.view' },
      },
      {
        key: 'members',
        title: 'Members',
        href: '/settings/users',
        icon: 'members',
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
