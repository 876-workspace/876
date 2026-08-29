import {
  BarChart3,
  Building2,
  ChatBubbleLeftIcon,
  ChartPieIcon,
  Database,
  KeyRound,
  RectangleGroup,
  Settings,
  SquaresPlusIcon,
  Users,
} from '@876/ui/icons'
import type { IconComponent } from '@876/ui/icons'

/** A top-level sidebar item. */
export type NavItem = {
  title: string
  href: string
  icon: IconComponent
  color?: string
  colorClassName?: string
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
        colorClassName: 'text-blue-500 dark:text-blue-400',
      },
      {
        title: 'Users',
        href: '/users',
        icon: Users,
        color: 'var(--876-blue)',
        colorClassName: 'text-amber-500 dark:text-amber-400',
      },
      {
        title: 'Organizations',
        href: '/orgs',
        icon: Building2,
        color: 'var(--876-gold)',
        colorClassName: 'text-amber-500 dark:text-amber-400',
      },
      {
        title: 'Requests',
        href: '/requests',
        icon: ChatBubbleLeftIcon,
        color: 'var(--876-blue)',
        colorClassName: 'text-cyan-500 dark:text-cyan-400',
      },
      {
        title: 'Security',
        href: '/security',
        icon: KeyRound,
        color: 'var(--876-blue)',
        colorClassName: 'text-rose-500 dark:text-rose-400',
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
        colorClassName: 'text-purple-500 dark:text-purple-400',
      },
      {
        title: 'Widgets',
        href: '/widgets',
        icon: RectangleGroup,
        color: 'var(--876-gold)',
        colorClassName: 'text-emerald-500 dark:text-emerald-400',
      },
      {
        title: 'Storage',
        href: '/storage',
        icon: Database,
        color: 'var(--876-blue)',
        colorClassName: 'text-blue-500 dark:text-blue-400',
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
        colorClassName: 'text-amber-500 dark:text-amber-400',
      },
      {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        color: 'var(--876-blue)',
        colorClassName: 'text-slate-500 dark:text-slate-400',
      },
    ],
  },
]
