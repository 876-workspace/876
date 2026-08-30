'use client'

import {
  CompactUserMenu,
  type SidebarUserMenuUser,
} from '@876/ui/sidebar-user-menu'

import { account } from '@/lib/services/account'
import { useUserStore } from '@/stores/user'

export function UserMenu({ user }: { user: SidebarUserMenuUser }) {
  async function handleSignOut() {
    useUserStore.getState().clearUser()
    await account.auth.logout()
    window.location.href = '/login'
  }

  return (
    <CompactUserMenu
      user={user}
      onSignOut={handleSignOut}
      showSystemTheme={false}
      showThemeSwitcher
    />
  )
}
