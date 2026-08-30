import type { ComponentType, SVGProps } from 'react'
import {
  Activity,
  AdjustmentsHorizontalIcon,
  ArrowTrendingUpIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  TagIcon,
  UserIcon,
  UsersIcon,
} from '@876/ui/icons'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

export type SettingsIconKey =
  | 'automation'
  | 'categories'
  | 'email'
  | 'members'
  | 'preferences'
  | 'priorities'
  | 'statuses'
  | 'teams'

export type SettingsNavItem = {
  label: string
  icon: SettingsIconKey
  availability: 'available' | 'planned'
  href?: string
}

export type SettingsNavGroup = {
  label: string
  items: SettingsNavItem[]
}

export const SETTINGS_ITEM_CONFIG: Record<
  SettingsIconKey,
  {
    icon: Icon
    bg: string
    text: string
    border: string
  }
> = {
  teams: {
    icon: UsersIcon,
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
  },
  categories: {
    icon: TagIcon,
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
  },
  priorities: {
    icon: ArrowTrendingUpIcon,
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
  },
  statuses: {
    icon: AdjustmentsHorizontalIcon,
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-500/30',
  },
  automation: {
    icon: Activity,
    bg: 'bg-violet-500/10 dark:bg-violet-500/20',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/30',
  },
  email: {
    icon: EnvelopeIcon,
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
  },
  members: {
    icon: UserIcon,
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500/30',
  },
  preferences: {
    icon: Cog6ToothIcon,
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/30',
  },
}

export const SETTINGS_ICON_RESOLVER: Record<SettingsIconKey, Icon> = {
  automation: SETTINGS_ITEM_CONFIG.automation.icon,
  categories: SETTINGS_ITEM_CONFIG.categories.icon,
  email: SETTINGS_ITEM_CONFIG.email.icon,
  members: SETTINGS_ITEM_CONFIG.members.icon,
  preferences: SETTINGS_ITEM_CONFIG.preferences.icon,
  priorities: SETTINGS_ITEM_CONFIG.priorities.icon,
  statuses: SETTINGS_ITEM_CONFIG.statuses.icon,
  teams: SETTINGS_ITEM_CONFIG.teams.icon,
}

export const SETTINGS_GROUPS: SettingsNavGroup[] = [
  {
    label: 'Workspace',
    items: [
      {
        label: 'Teams',
        icon: 'teams',
        availability: 'available',
        href: '/settings/teams',
      },
      {
        label: 'Categories',
        icon: 'categories',
        availability: 'available',
        href: '/settings/categories',
      },
    ],
  },
  {
    label: 'Requests',
    items: [
      {
        label: 'Priorities',
        icon: 'priorities',
        availability: 'available',
        href: '/settings/priorities',
      },
      {
        label: 'Statuses',
        icon: 'statuses',
        availability: 'planned',
      },
      {
        label: 'Automation rules',
        icon: 'automation',
        availability: 'planned',
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
        label: 'Members',
        icon: 'members',
        availability: 'planned',
      },
      {
        label: 'Preferences',
        icon: 'preferences',
        availability: 'planned',
      },
    ],
  },
]
