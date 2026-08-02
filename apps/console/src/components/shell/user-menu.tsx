'use client'

import { CompactUserMenu } from '@876/ui/sidebar-user-menu'

import type { ShellUser } from '@/components/shell/shell'
import { request } from '@/lib/client/request'

export function UserMenu({
  user,
  showThemeSwitcher = true,
}: {
  user: ShellUser
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
