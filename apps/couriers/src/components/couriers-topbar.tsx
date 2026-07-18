'use client'

import { useRouter } from 'next/navigation'

import { OrgSwitcher, type OrgSwitcherOrg } from '@876/ui/org-switcher'
import {
  CompactUserMenu,
  type SidebarUserMenuUser,
} from '@876/ui/sidebar-user-menu'
import { TopbarSearch, type TopbarSearchItem } from '@876/ui/topbar-search'

import { couriersNav } from './couriers-nav-config'
import { request } from '@/lib/client/request'

const SETTINGS_SEARCH_ITEMS = [
  { title: 'Settings', href: '/settings' },
  { title: 'General', href: '/settings/general' },
  { title: 'Billing', href: '/settings/billing' },
  { title: 'Notifications', href: '/settings/notifications' },
  { title: 'Team', href: '/settings/team' },
]

export function CouriersOrgSwitcher({
  current,
  orgs,
}: {
  current: OrgSwitcherOrg
  orgs: OrgSwitcherOrg[]
}) {
  const router = useRouter()

  return (
    <OrgSwitcher
      current={current}
      orgs={orgs}
      onSelect={(org) => router.push(`/org/${org.slug}`)}
    />
  )
}

export function CouriersTopbarSearch({ basePath }: { basePath: string }) {
  const router = useRouter()

  return (
    <TopbarSearch
      items={getSearchItems(basePath)}
      onNavigate={(href) => router.push(href)}
    />
  )
}

export function CouriersUserMenu({
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
  const navigationItems = couriersNav.flatMap((group) =>
    group.items.map((item) => ({
      group: 'Navigation',
      title: item.title,
      href: basePath + item.href,
    }))
  )
  const childItems = couriersNav.flatMap((group) =>
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
