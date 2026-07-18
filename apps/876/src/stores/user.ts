'use client'

import { create } from 'zustand'

import type { AuthLoginSuccessData, AuthUser } from '@876/types/auth'
import type { UserStoreUser } from '@876/types/user'

export type UserStoreSourceUser = AuthLoginSuccessData['user']
type UserStoreWorkosUser = Exclude<UserStoreSourceUser, AuthUser>

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
  if ('status' in user) return normalizeAuthUser(user)

  return normalizeWorkosUser(user)
}

function normalizeWorkosUser(user: UserStoreWorkosUser): UserStoreUser {
  return {
    id: user.id,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    phoneNumber: null,
    email: user.email,
    username: null,
    avatar: user.avatar,
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
