import { defineNavigation } from '@876/core/access'

/** Unlabelled Console navigation groups rendered in sidebar order. */
export const navConfig = defineNavigation([
  {
    key: 'primary',
    entries: [
      {
        key: 'dashboards',
        title: 'Dashboards',
        href: '/',
        icon: 'dashboard',
        colorClassName: 'text-blue-500 dark:text-blue-400',
        activeClassName: 'bg-blue-500/12 ring-blue-500/30',
      },
      {
        key: 'users',
        title: 'Users',
        href: '/users',
        icon: 'users',
        colorClassName: 'text-amber-500 dark:text-amber-400',
        activeClassName: 'bg-amber-500/12 ring-amber-500/30',
        requires: { permission: 'console:users' },
      },
      {
        key: 'organizations',
        title: 'Organizations',
        href: '/orgs',
        icon: 'organizations',
        colorClassName: 'text-amber-500 dark:text-amber-400',
        activeClassName: 'bg-amber-500/12 ring-amber-500/30',
        requires: { permission: 'console:organizations' },
      },
      {
        key: 'support',
        title: 'Support',
        href: '/support',
        icon: 'support',
        colorClassName: 'text-cyan-500 dark:text-cyan-400',
        activeClassName: 'bg-cyan-500/12 ring-cyan-500/30',
        requires: { permission: 'console:support' },
      },
      {
        key: 'security',
        title: 'Security',
        href: '/security',
        icon: 'security',
        colorClassName: 'text-rose-500 dark:text-rose-400',
        activeClassName: 'bg-rose-500/12 ring-rose-500/30',
        requires: { permission: 'console:security' },
      },
    ],
  },
  {
    key: 'platform',
    entries: [
      {
        key: 'apps',
        title: 'Apps',
        href: '/apps',
        icon: 'apps',
        colorClassName: 'text-purple-500 dark:text-purple-400',
        activeClassName: 'bg-purple-500/12 ring-purple-500/30',
        requires: { permission: 'console:apps' },
      },
      {
        key: 'widgets',
        title: 'Widgets',
        href: '/widgets',
        icon: 'widgets',
        colorClassName: 'text-emerald-500 dark:text-emerald-400',
        activeClassName: 'bg-emerald-500/12 ring-emerald-500/30',
        requires: { permission: 'console:widgets' },
      },
      {
        key: 'storage',
        title: 'Storage',
        href: '/storage',
        icon: 'storage',
        colorClassName: 'text-blue-500 dark:text-blue-400',
        activeClassName: 'bg-blue-500/12 ring-blue-500/30',
        requires: { permission: 'console:storage' },
      },
    ],
  },
  {
    key: 'manage',
    entries: [
      {
        key: 'reports',
        title: 'Reports',
        href: '/reports',
        icon: 'reports',
        colorClassName: 'text-amber-500 dark:text-amber-400',
        activeClassName: 'bg-amber-500/12 ring-amber-500/30',
        requires: { permission: 'console:reports' },
      },
      {
        key: 'settings',
        title: 'Settings',
        href: '/settings',
        icon: 'settings',
        colorClassName: 'text-slate-500 dark:text-slate-400',
        activeClassName: 'bg-slate-500/12 ring-slate-500/30',
        requires: { permission: 'console:settings' },
      },
    ],
  },
])
