import { defineNavigation } from '@876/core/access'

/**
 * Unlabelled Console navigation groups rendered in sidebar order.
 *
 * An entry with `children` is a **drill-down section**: the rail replaces
 * itself with that section's items. Only entries that genuinely own a subtree
 * declare children, so a rail click never opens a panel holding a single link.
 * Every child is permission-gated by the same key its route guard checks;
 * `route-permissions.test.ts` binds the two.
 */
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
        key: 'projects',
        title: 'Projects',
        href: '/projects',
        icon: 'projects',
        colorClassName: 'text-indigo-500 dark:text-indigo-400',
        activeClassName: 'bg-indigo-500/12 ring-indigo-500/30',
        requires: { permission: 'projects/dashboard.view' },
        children: [
          {
            key: 'projects-overview',
            title: 'Overview',
            href: '/projects',
            icon: 'overview',
            requires: { permission: 'projects/dashboard.view' },
          },
          {
            key: 'projects-projects',
            title: 'Projects',
            href: '/projects/projects',
            icon: 'folder',
            requires: { permission: 'projects/dashboard.view' },
          },
          {
            key: 'projects-issues',
            title: 'Issues',
            href: '/projects/issues',
            icon: 'issues',
            requires: { permission: 'projects/dashboard.view' },
          },
          {
            key: 'projects-board',
            title: 'Board',
            href: '/projects/board',
            icon: 'board',
            requires: { permission: 'projects/dashboard.view' },
          },
          {
            key: 'projects-labels',
            title: 'Labels',
            href: '/projects/labels',
            icon: 'labels',
            requires: { permission: 'projects/dashboard.view' },
          },
        ],
      },
      {
        key: 'requests',
        title: 'Requests',
        href: '/requests',
        icon: 'requests',
        colorClassName: 'text-cyan-500 dark:text-cyan-400',
        activeClassName: 'bg-cyan-500/12 ring-cyan-500/30',
        requires: { permission: 'crm/requests.view' },
        children: [
          {
            key: 'requests-list',
            title: 'Requests',
            href: '/requests',
            icon: 'requests',
            requires: { permission: 'crm/requests.view' },
          },
          {
            key: 'requests-customers',
            title: 'Customers',
            href: '/requests/customers',
            icon: 'customers',
            requires: { permission: 'crm/requests.view' },
          },
          {
            key: 'requests-forms',
            title: 'Forms',
            href: '/requests/forms',
            icon: 'forms',
            requires: { permission: 'crm/requests.view' },
          },
          {
            key: 'requests-all',
            title: 'All Organizations',
            href: '/requests/all',
            icon: 'reports',
            requires: { permission: 'console:crm.view-all' },
          },
        ],
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
