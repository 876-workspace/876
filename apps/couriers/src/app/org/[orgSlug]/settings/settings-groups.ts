import type { ComponentType, SVGProps } from 'react'
import {
  BuildingOffice2Icon,
  CreditCardIcon,
  Cog6ToothIcon,
  UsersIcon,
} from '@876/ui/icons'

export type SettingsItem = {
  title: string
  /** Present when the page exists — the item renders as a link. */
  href?: string
}

export type SettingsGroup = {
  title: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /** Tailwind classes for the icon tile — one accent hue per group. */
  tileClass: string
  iconClass: string
  items: SettingsItem[]
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    title: 'Organization',
    icon: BuildingOffice2Icon,
    tileClass: 'bg-blue-500/10',
    iconClass: 'text-blue-600 dark:text-blue-400',
    items: [
      { title: 'Profile', href: '/settings/orgprofile' },
      { title: 'Branding' },
      { title: 'Custom domain' },
      { title: 'Locations' },
      { title: 'Manage subscription' },
    ],
  },
  {
    title: 'Users & roles',
    icon: UsersIcon,
    tileClass: 'bg-violet-500/10',
    iconClass: 'text-violet-600 dark:text-violet-400',
    items: [
      { title: 'Team', href: '/settings/team' },
      { title: 'Roles' },
      { title: 'User preferences' },
    ],
  },
  {
    title: 'Setup & configuration',
    icon: Cog6ToothIcon,
    tileClass: 'bg-amber-500/10',
    iconClass: 'text-amber-600 dark:text-amber-400',
    items: [
      { title: 'General', href: '/settings/general' },
      { title: 'Notifications', href: '/settings/notifications' },
      { title: 'Currencies' },
      { title: 'Address format' },
    ],
  },
  {
    title: 'Billing',
    icon: CreditCardIcon,
    tileClass: 'bg-rose-500/10',
    iconClass: 'text-rose-600 dark:text-rose-400',
    items: [{ title: 'Billing', href: '/settings/billing' }],
  },
]
