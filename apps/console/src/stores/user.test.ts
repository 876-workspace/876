/** @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useConsoleUser, useConsoleUserStore } from './user'

const user = {
  id: 'user_123',
  name: 'Alejandra Reyes',
  firstName: 'Alejandra',
  lastName: 'Reyes',
  email: 'alejandra@example.com',
  avatar: null,
  role: 'admin',
  permissions: ['console:access'],
  status: 'active',
  banned: false,
}

describe('Console user store', () => {
  beforeEach(() => {
    useConsoleUserStore.setState({ user: null })
  })

  it('starts without a display user', () => {
    expect(useConsoleUserStore.getState().user).toBeNull()
  })

  it('stores a server-hydrated display user', () => {
    act(() => useConsoleUserStore.getState().setUser(user))

    expect(useConsoleUserStore.getState().user).toEqual(user)
  })

  it('clears the display user', () => {
    useConsoleUserStore.setState({ user })

    act(() => useConsoleUserStore.getState().clearUser())

    expect(useConsoleUserStore.getState().user).toBeNull()
  })

  it('selects the current user through the public hook', () => {
    useConsoleUserStore.setState({ user })

    const { result } = renderHook(() => useConsoleUser())

    expect(result.current).toEqual(user)
  })
})
