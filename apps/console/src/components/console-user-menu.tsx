'use client'

import { CompactUserMenu } from '@876/ui/sidebar-user-menu'

import type { ConsoleShellUser } from './console-shell'
import { request } from '@/lib/client/request'

export function ConsoleUserMenu({
  user,
  showThemeSwitcher = true,
}: {
  user: ConsoleShellUser
  showThemeSwitcher?: boolean
}) {
  async function handleSignOut() {
    await request<unknown>('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
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
