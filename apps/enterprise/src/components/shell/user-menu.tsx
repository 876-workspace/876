'use client'

import {
  CompactUserMenu,
  type SidebarUserMenuUser,
} from '@876/ui/sidebar-user-menu'

import { $876 } from '@/lib/876'
import { useUserStore } from '@/stores/user'

export function UserMenu({ user }: { user: SidebarUserMenuUser }) {
  async function handleSignOut() {
    useUserStore.getState().clearUser()
    await $876.auth.logout()
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
