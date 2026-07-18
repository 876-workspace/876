import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import type { AuthUser } from '@876/types/auth'
import type { WorkosUser } from '@876/types/workos'

import {
  useCurrentUser,
  useIsAuthenticated,
  useIsUserLoading,
  useUserStore,
} from '../user'

beforeEach(() => {
  useUserStore.setState({ user: null, isAuthenticated: false, isLoading: true })
})

describe('useUserStore', () => {
  describe('setUser with AuthUser', () => {
    it('sets user, marks authenticated, clears loading', () => {
      const user: AuthUser = {
        object: 'user',
        id: 'user_9HkL2mNq',
        email: 'danika_herzog@gmail.com',
        username: 'danika_herzog',
        emailVerified: true,
        firstName: 'Danika',
        lastName: 'Herzog',
        middleName: null,
        avatar: 'https://example.com/avatar.jpg',
        status: 'active',
        stripeCustomerId: null,
        createdAt: 1_704_108_000,
        updatedAt: 1_704_108_000,
      }

      useUserStore.getState().setUser(user)

      const state = useUserStore.getState()
      expect(state.user).toEqual({
        id: 'user_9HkL2mNq',
        firstName: 'Danika',
        lastName: 'Herzog',
        phoneNumber: null,
        email: 'danika_herzog@gmail.com',
        username: 'danika_herzog',
        avatar: 'https://example.com/avatar.jpg',
      })
      expect(state.isAuthenticated).toBe(true)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('setUser with WorkosUser', () => {
    it('normalizes WorkosUser avatar', () => {
      const user: WorkosUser = {
        object: 'user',
        id: 'workos_456',
        email: 'john@example.com',
        emailVerified: true,
        avatar: 'https://example.com/pic.jpg',
        firstName: 'John',
        lastName: null,
        lastSignInAt: '2024-01-15T10:30:00.000Z',
        locale: 'en',
        createdAt: '2023-06-01T00:00:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
        externalId: null,
        metadata: {},
      }

      useUserStore.getState().setUser(user)

      const state = useUserStore.getState()
      expect(state.user).toEqual({
        id: 'workos_456',
        firstName: 'John',
        lastName: '',
        phoneNumber: null,
        email: 'john@example.com',
        username: null,
        avatar: 'https://example.com/pic.jpg',
      })
    })

    it('normalizes AuthUser with org membership', () => {
      const user: AuthUser = {
        object: 'user',
        id: 'user_ent_001',
        email: 'ceo@corp.com',
        username: 'ceo',
        emailVerified: true,
        firstName: 'Big',
        lastName: 'Boss',
        middleName: null,
        avatar: null,
        status: 'active',
        stripeCustomerId: null,
        createdAt: 1_704_108_000,
        updatedAt: 1_704_108_000,
      }

      useUserStore.getState().setUser(user)

      expect(useUserStore.getState().user).toEqual({
        id: 'user_ent_001',
        firstName: 'Big',
        lastName: 'Boss',
        phoneNumber: null,
        email: 'ceo@corp.com',
        username: 'ceo',
        avatar: null,
      })
      expect(useUserStore.getState().isAuthenticated).toBe(true)
    })

    it('handles null firstName and lastName with empty string fallback', () => {
      const user: WorkosUser = {
        object: 'user',
        id: 'workos_789',
        email: 'alice@example.com',
        emailVerified: true,
        avatar: null,
        firstName: null,
        lastName: null,
        lastSignInAt: '2024-01-15T10:30:00.000Z',
        locale: 'en',
        createdAt: '2023-06-01T00:00:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
        externalId: null,
        metadata: {},
      }

      useUserStore.getState().setUser(user)

      expect(useUserStore.getState().user?.firstName).toBe('')
      expect(useUserStore.getState().user?.lastName).toBe('')
    })
  })

  describe('clearUser', () => {
    it('is idempotent when already null', () => {
      expect(useUserStore.getState().user).toBeNull()

      useUserStore.getState().clearUser()

      const state = useUserStore.getState()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isLoading).toBe(false)
    })

    it('resets user to null and clears authenticated state', () => {
      useUserStore.getState().setUser({
        object: 'user',
        id: 'user_9HkL2mNq',
        email: 'danika_herzog@gmail.com',
        username: null,
        emailVerified: true,
        firstName: 'Danika',
        lastName: 'Herzog',
        middleName: null,
        avatar: null,
        status: 'active',
        stripeCustomerId: null,
        createdAt: 1_704_108_000,
        updatedAt: 1_704_108_000,
      } satisfies AuthUser)

      useUserStore.getState().clearUser()

      const state = useUserStore.getState()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('setLoading', () => {
    it('updates loading state', () => {
      useUserStore.getState().setLoading(false)
      expect(useUserStore.getState().isLoading).toBe(false)

      useUserStore.getState().setLoading(true)
      expect(useUserStore.getState().isLoading).toBe(true)
    })
  })

  describe('hooks', () => {
    it('useCurrentUser returns null by default', () => {
      const { result } = renderHook(() => useCurrentUser())
      expect(result.current).toBeNull()
    })

    it('useCurrentUser returns user after setUser', () => {
      useUserStore.getState().setUser({
        object: 'user',
        id: 'user_9HkL2mNq',
        email: 'danika_herzog@gmail.com',
        username: null,
        emailVerified: true,
        firstName: 'Danika',
        lastName: 'Herzog',
        middleName: null,
        avatar: null,
        status: 'active',
        stripeCustomerId: null,
        createdAt: 1_704_108_000,
        updatedAt: 1_704_108_000,
      } satisfies AuthUser)

      const { result } = renderHook(() => useCurrentUser())
      expect(result.current).toEqual({
        id: 'user_9HkL2mNq',
        firstName: 'Danika',
        lastName: 'Herzog',
        phoneNumber: null,
        email: 'danika_herzog@gmail.com',
        username: null,
        avatar: null,
      })
    })

    it('useIsAuthenticated returns false initially', () => {
      const { result } = renderHook(() => useIsAuthenticated())
      expect(result.current).toBe(false)
    })

    it('useIsAuthenticated returns true after setUser', () => {
      useUserStore.getState().setUser({
        object: 'user',
        id: 'user_9HkL2mNq',
        email: 'danika_herzog@gmail.com',
        username: null,
        emailVerified: true,
        firstName: 'Danika',
        lastName: 'Herzog',
        middleName: null,
        avatar: null,
        status: 'active',
        stripeCustomerId: null,
        createdAt: 1_704_108_000,
        updatedAt: 1_704_108_000,
      } satisfies AuthUser)

      const { result } = renderHook(() => useIsAuthenticated())
      expect(result.current).toBe(true)
    })

    it('useIsUserLoading returns true initially', () => {
      const { result } = renderHook(() => useIsUserLoading())
      expect(result.current).toBe(true)
    })

    it('useIsUserLoading returns false after setLoading', () => {
      useUserStore.getState().setLoading(false)

      const { result } = renderHook(() => useIsUserLoading())
      expect(result.current).toBe(false)
    })
  })
})
