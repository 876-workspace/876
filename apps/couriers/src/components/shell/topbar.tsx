'use client'

import { useRouter } from 'next/navigation'

import {
  OrgSwitcher as OrgSwitcherRoot,
  type OrgSwitcherOrg,
} from '@876/ui/org-switcher'
import {
  CompactUserMenu,
  type SidebarUserMenuUser,
} from '@876/ui/sidebar-user-menu'
import {
  TopbarSearch as TopbarSearchRoot,
  type TopbarSearchItem,
} from '@876/ui/topbar-search'

import { nav } from './nav-config'
import { request } from '@/lib/client/request'

const SETTINGS_SEARCH_ITEMS = [
  { title: 'General', href: '/settings/general' },
  { title: 'Billing', href: '/settings/billing' },
  { title: 'Notifications', href: '/settings/notifications' },
  { title: 'Team', href: '/settings/team' },
]

export function OrgSwitcher({
  current,
  orgs,
}: {
  current: OrgSwitcherOrg
  orgs: OrgSwitcherOrg[]
}) {
  const router = useRouter()

  return (
    <OrgSwitcherRoot
      current={current}
      orgs={orgs}
      onSelect={(org) => router.push(`/${org.slug}`)}
    />
  )
}

export function TopbarSearch({ basePath }: { basePath: string }) {
  const router = useRouter()

  return (
    <TopbarSearchRoot
      items={getSearchItems(basePath)}
      onNavigate={(href) => router.push(href)}
    />
  )
}

export function UserMenu({
  user,
  showThemeSwitcher,
}: {
  user: SidebarUserMenuUser
  showThemeSwitcher: boolean
}) {
  async function handleSignOut() {
    await request<unknown>('/api/manage-auth/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <CompactUserMenu
      user={user}
      onSignOut={handleSignOut}
      showThemeSwitcher={showThemeSwitcher}
      showSystemTheme={false}
    />
  )
}

function getSearchItems(basePath: string): TopbarSearchItem[] {
  const navigationItems = nav.flatMap((group) =>
    group.items
      .filter((item) => item.href !== '#')
      .map((item) => ({
        group: 'Navigation',
        title: item.title,
        href: basePath + item.href,
      }))
  )
  const childItems = nav.flatMap((group) =>
    group.items.flatMap((item) =>
      (item.children ?? []).map((child) => ({
        group: item.title,
        title: child.title,
        href: basePath + child.href,
      }))
    )
  )
  const settingsItems = SETTINGS_SEARCH_ITEMS.map((item) => ({
    group: 'Settings',
    title: item.title,
    href: basePath + item.href,
  }))

  return [...navigationItems, ...childItems, ...settingsItems]
}
