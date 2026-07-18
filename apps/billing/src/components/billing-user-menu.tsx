'use client'

import {
  CompactUserMenu,
  type SidebarUserMenuUser,
} from '@876/ui/sidebar-user-menu'

import { request } from '@/lib/client/request'

export function BillingUserMenu({
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
      showSystemTheme={false}
      showThemeSwitcher={showThemeSwitcher}
    />
  )
}
