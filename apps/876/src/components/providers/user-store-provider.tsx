'use client'

import { useEffect, type ReactNode } from 'react'

import { useUserStore, type UserStoreSourceUser } from '@/stores/user'

/**
 * Hydrates the client user store from the server-resolved session. The session
 * is read once on the server (in the root layout) and passed down as a prop, so
 * the client never round-trips to a WorkOS server action to learn who is signed
 * in. The login/register flows also call `setUser` directly after authenticating.
 */
export function UserStoreProvider({
  initialUser,
  children,
}: {
  initialUser: UserStoreSourceUser | null
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
