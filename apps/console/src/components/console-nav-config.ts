import {
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  Settings,
  StickyNote,
  Terminal,
  Users,
  Waves,
} from '@876/ui/icons'
import type { IconComponent } from '@876/ui/icons'

/** A single child link rendered inside a dropdown item. */
export type ConsoleNavChild = {
  title: string
  href: string
}

/** A top-level sidebar item. When `children` is set it renders as a dropdown. */
export type ConsoleNavItem = {
  title: string
  href: string
  icon: IconComponent
  color?: string
  children?: ConsoleNavChild[]
}

/**
 * A labelled group of sidebar items.
 * When `label` is an empty string the group heading is suppressed.
 */
export type ConsoleNavGroup = {
  label: string
  items: ConsoleNavItem[]
}

/**
 * Main Console navigation groups rendered in the scrollable sidebar
 * content area. Settings is rendered separately at the bottom.
 */
export const consoleNav: ConsoleNavGroup[] = [
  // ── Core — no visible group heading ────────────────────────────────────────
  {
    label: '',
    items: [
      {
        title: 'Dashboard',
        href: '/',
        icon: BarChart3,
        color: 'var(--876-blue)',
      },
      {
        title: 'Users',
        href: '/users',
        icon: Users,
        color: 'var(--876-green)',
      },
      {
        title: 'Organizations',
        href: '/orgs',
        icon: Building2,
        color: 'var(--876-gold)',
      },
      {
        title: 'Apps',
        href: '/apps',
        icon: LayoutDashboard,
        color: 'var(--876-purple)',
        children: [
          { title: '876', href: '/apps/876-consumer' },
          { title: '876 Enterprise', href: '/apps/876-enterprise' },
          { title: '876 Couriers', href: '/apps/876-couriers' },
          { title: '876 Billing', href: '/apps/876-billing' },
          { title: 'Console', href: '/apps/console' },
        ],
      },
      {
        title: 'Billing',
        href: '/billing',
        icon: CreditCard,
        color: 'var(--876-green)',
      },
      {
        title: 'Widgets',
        href: '/widgets',
        icon: StickyNote,
        color: 'var(--876-gold)',
      },
      {
        title: 'Sessions',
        href: '/sessions',
        icon: Terminal,
        color: 'var(--876-blue)',
      },
      {
        title: 'Audit Log',
        href: '/audit-log',
        icon: ClipboardList,
        color: 'var(--876-gold)',
      },
    ],
  },
]

/** Settings item rendered pinned at the bottom of the sidebar above the user menu. */
export const consoleSettingsItem: ConsoleNavItem = {
  title: 'Settings',
  href: '/settings',
  icon: Settings,
  color: 'var(--876-blue)',
}

/** Settings sub-sections used on the /settings overview page. */
export const SETTINGS_SECTIONS = [
  {
    title: 'General',
    description: 'Platform name, timezone, and global defaults.',
    href: '/settings/general',
    icon: Settings,
    iconColor: 'text-muted-foreground',
  },
  {
    title: 'Users',
    description: 'Manage who has access to Console.',
    href: '/settings/users',
    icon: Users,
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    title: 'Security',
    description:
      'Auth policies, session limits, reserved usernames, and OAuth configuration.',
    href: '/settings/security',
    icon: KeyRound,
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    title: 'Notifications',
    description: 'Alert channels and event subscriptions.',
    href: '/settings/notifications',
    icon: Waves,
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
]
