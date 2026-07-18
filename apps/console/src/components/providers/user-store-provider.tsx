'use client'

import { useEffect, type ReactNode } from 'react'

import { useConsoleUserStore } from '@/stores/user'
import type { ConsoleUser } from '@/types/user'

/**
 * Hydrates the Console user store from the server-resolved session.
 * The layout fetches the user once on the server and passes it as a prop;
 * this component syncs it into Zustand for client components (avatar, dropdown).
 *
 * Auth truth remains on the server. This store is display state only.
 */
export function UserStoreProvider({
  initialUser,
  children,
}: {
  initialUser: ConsoleUser | null
  children: ReactNode
}) {
  useEffect(() => {
    const store = useConsoleUserStore.getState()
    if (initialUser) {
      store.setUser(initialUser)
    } else {
      store.clearUser()
    }
  }, [initialUser])

  return <>{children}</>
}
