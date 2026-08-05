import {
  BarChart3,
  Building2,
  ChartPieIcon,
  Database,
  KeyRound,
  RectangleGroup,
  Settings,
  SquaresPlusIcon,
  Users,
  Waves,
} from '@876/ui/icons'
import type { IconComponent } from '@876/ui/icons'

/** A single child link rendered inside a dropdown item. */
export type NavChild = {
  title: string
  href: string
}

/** A top-level sidebar item. When `children` is set it renders as a dropdown. */
export type NavItem = {
  title: string
  href: string
  icon: IconComponent
  color?: string
  children?: NavChild[]
}

export type NavGroup = {
  items: NavItem[]
}

/** Unlabelled Console navigation groups rendered in sidebar order. */
export const navConfig: NavGroup[] = [
  {
    items: [
      {
        title: 'Dashboards',
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
        title: 'Security',
        href: '/security',
        icon: KeyRound,
        color: 'var(--876-blue)',
        children: [
          { title: 'Sign-ins', href: '/security/sign-ins' },
          { title: 'Sessions', href: '/sessions' },
        ],
      },
    ],
  },
  {
    items: [
      {
        title: 'Apps',
        href: '/apps',
        icon: SquaresPlusIcon,
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
        title: 'Widgets',
        href: '/widgets',
        icon: RectangleGroup,
        color: 'var(--876-gold)',
      },
      {
        title: 'Storage',
        href: '/storage',
        icon: Database,
        color: 'var(--876-blue)',
      },
    ],
  },
  {
    items: [
      {
        title: 'Reports',
        href: '/reports',
        icon: ChartPieIcon,
        color: 'var(--876-gold)',
      },
      {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        color: 'var(--876-blue)',
      },
    ],
  },
]

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
