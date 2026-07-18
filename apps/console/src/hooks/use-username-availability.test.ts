/** @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react'
import { NETWORK_OFFLINE_ERROR } from '@876/core/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useUsernameAvailability } from './use-username-availability'

const { checkUsernameAvailability } = vi.hoisted(() => ({
  checkUsernameAvailability: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  client: { users: { checkUsernameAvailability } },
}))

describe('useUsernameAvailability', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    checkUsernameAvailability.mockResolvedValue({
      data: { available: true, reason: 'Username is available.' },
      error: null,
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it.each(['', '   ', '\t\n'])(
    'stays idle for empty input %j without querying the API',
    (username) => {
      const { result } = renderHook(() => useUsernameAvailability(username))

      expect(result.current).toEqual({ status: 'idle' })
      expect(checkUsernameAvailability).not.toHaveBeenCalled()
    }
  )

  it('stays idle for an unchanged value ignoring case and whitespace', () => {
    const { result } = renderHook(() =>
      useUsernameAvailability('  Alejandra  ', {
        unchangedValue: 'alejandra',
      })
    )

    expect(result.current).toEqual({ status: 'idle' })
    expect(checkUsernameAvailability).not.toHaveBeenCalled()
  })

  it('reports checking before the debounce completes', () => {
    const { result } = renderHook(() => useUsernameAvailability('alejandra'))

    expect(result.current).toEqual({ status: 'checking' })
    expect(checkUsernameAvailability).not.toHaveBeenCalled()
  })

  it('reports an available username after the debounce', async () => {
    const { result } = renderHook(() =>
      useUsernameAvailability('  alejandra  ', {
        excludeUserId: 'user_123',
      })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })

    expect(result.current).toEqual({
      status: 'available',
      message: 'Username is available.',
    })
    expect(checkUsernameAvailability).toHaveBeenCalledTimes(1)
    expect(checkUsernameAvailability).toHaveBeenCalledWith(
      'alejandra',
      'user_123'
    )
  })

  it('reports a domain-level unavailable verdict', async () => {
    checkUsernameAvailability.mockResolvedValue({
      data: { available: false, reason: 'Username is reserved.' },
      error: null,
    })
    const { result } = renderHook(() =>
      useUsernameAvailability('administrator')
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })

    expect(result.current).toEqual({
      status: 'unavailable',
      message: 'Username is reserved.',
    })
  })

  it('reports a transport error as unavailable', async () => {
    checkUsernameAvailability.mockResolvedValue({
      data: null,
      error: NETWORK_OFFLINE_ERROR,
    })
    const { result } = renderHook(() => useUsernameAvailability('alejandra'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })

    expect(result.current).toEqual({
      status: 'unavailable',
      message: NETWORK_OFFLINE_ERROR.message,
    })
  })

  it('uses a fallback when the transport returns neither data nor error', async () => {
    checkUsernameAvailability.mockResolvedValue({ data: null, error: null })
    const { result } = renderHook(() => useUsernameAvailability('alejandra'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })

    expect(result.current).toEqual({
      status: 'unavailable',
      message: 'Could not check username.',
    })
  })

  it('cancels a queued check when the username becomes unchanged', async () => {
    const { result, rerender } = renderHook(
      ({ username }) =>
        useUsernameAvailability(username, { unchangedValue: 'alejandra' }),
      { initialProps: { username: 'new-name' } }
    )

    rerender({ username: 'alejandra' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })

    expect(result.current).toEqual({ status: 'idle' })
    expect(checkUsernameAvailability).not.toHaveBeenCalled()
  })

  it('ignores an in-flight verdict after the input changes', async () => {
    let resolveFirst: ((value: unknown) => void) | undefined
    checkUsernameAvailability
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          })
      )
      .mockResolvedValueOnce({
        data: { available: false, reason: 'Second name is unavailable.' },
        error: null,
      })
    const { result, rerender } = renderHook(
      ({ username }) => useUsernameAvailability(username),
      { initialProps: { username: 'first-name' } }
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    rerender({ username: 'second-name' })
    await act(async () => {
      resolveFirst?.({
        data: { available: true, reason: 'First name is available.' },
        error: null,
      })
      await Promise.resolve()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })

    expect(result.current).toEqual({
      status: 'unavailable',
      message: 'Second name is unavailable.',
    })
    expect(checkUsernameAvailability).toHaveBeenCalledTimes(2)
  })
})
