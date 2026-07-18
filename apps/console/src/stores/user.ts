'use client'

import type { ConsoleUser } from '@/types/user'
import { create } from 'zustand'

/**
 * Display-only user state for Console.
 *
 * This store is hydrated from the server-resolved session in the root layout
 * and exists for fast UI updates (avatar, name, role badge). It is NOT an auth
 * gate — all access control runs server-side in RSC layouts via requireSession
 * and requireConsoleAccount.
 */

type ConsoleUserStoreState = {
  user: ConsoleUser | null
  setUser: (user: ConsoleUser) => void
  clearUser: () => void
}

export const useConsoleUserStore = create<ConsoleUserStoreState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}))

export function useConsoleUser() {
  return useConsoleUserStore((state) => state.user)
}
