'use client'

import {
  CompactUserMenu,
  type SidebarUserMenuUser,
} from '@876/ui/sidebar-user-menu'
import { ArrowDownFromLine } from '@876/ui/icons'

import { request } from '@/lib/client/request'

const MENU_ITEMS = [
  {
    href: '/install',
    icon: <ArrowDownFromLine aria-hidden="true" />,
    label: 'Install app',
  },
]

export function UserMenu({
  user,
  showThemeSwitcher,
}: {
  user: SidebarUserMenuUser
  showThemeSwitcher: boolean
}) {
  async function handleSignOut() {
    await request<unknown>('/api/auth/logout', { method: 'POST' })
    window.location.assign('/login')
  }

  return (
    <CompactUserMenu
      user={user}
      onSignOut={handleSignOut}
      items={MENU_ITEMS}
      showSystemTheme={false}
      showThemeSwitcher={showThemeSwitcher}
    />
  )
}
