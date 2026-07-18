'use client'

import { useEffect, type ReactNode } from 'react'

import { useUserStore } from '@/stores/user'
import type { SessionUser } from '@/types/auth'

export function UserStoreProvider({
  initialUser,
  children,
}: {
  initialUser: SessionUser | null
  children: ReactNode
}) {
  useEffect(() => {
    const store = useUserStore.getState()

    if (initialUser) {
      store.setUser(initialUser)
      return
    }

    store.clearUser()
  }, [initialUser])

  return children
}
