'use client'

import { create } from 'zustand'

import type { AuthLoginSuccessData, AuthUser } from '@876/types/auth'
import type { UserStoreUser } from '@876/types/user'

import type { SessionUser } from '@/types/auth'

export type UserStoreSourceUser = AuthLoginSuccessData['user'] | SessionUser

type UserStoreState = {
  user: UserStoreUser | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: UserStoreSourceUser) => void
  clearUser: () => void
  setLoading: (isLoading: boolean) => void
}

export const useUserStore = create<UserStoreState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) =>
    set({
      user: normalizeUser(user),
      isAuthenticated: true,
      isLoading: false,
    }),
  clearUser: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
  setLoading: (isLoading) => set({ isLoading }),
}))

export function useCurrentUser() {
  return useUserStore((state) => state.user)
}

export function useIsAuthenticated() {
  return useUserStore((state) => state.isAuthenticated)
}

export function useIsUserLoading() {
  return useUserStore((state) => state.isLoading)
}

function normalizeUser(user: UserStoreSourceUser): UserStoreUser {
  if ('status' in user) return normalizeAuthUser(user as AuthUser)

  return normalizeSessionUser(user as SessionUser)
}

function normalizeSessionUser(user: SessionUser): UserStoreUser {
  return {
    id: user.id,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    phoneNumber: null,
    email: user.email,
    username: user.username ?? null,
    avatar: user.avatar ?? null,
  }
}

function normalizeAuthUser(user: AuthUser): UserStoreUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: null,
    email: user.email,
    username: user.username,
    avatar: user.avatar,
  }
}
