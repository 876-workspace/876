'use client'

import { useEffect, useState } from 'react'

import { client } from '@/lib/client'

type AvailabilityState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; message: string }
  | { status: 'unavailable'; message: string }

type Resolved =
  | { status: 'available'; message: string }
  | { status: 'unavailable'; message: string }

type Options = {
  /** Ignore the user who currently holds the name (editing their own profile). */
  excludeUserId?: string
  /** Treat this value as unchanged (no check, no error) — e.g. the saved username. */
  unchangedValue?: string | null
}

/**
 * Debounced live username availability check against the MC availability route.
 * Returns `idle` for empty/unchanged input, `checking` while in flight, then
 * `available` / `unavailable` with a human-readable message.
 *
 * `idle` and `checking` are derived during render (keyed to the current input)
 * so the effect only ever sets state from its async callback.
 */
export function useUsernameAvailability(
  username: string,
  { excludeUserId, unchangedValue }: Options = {}
): AvailabilityState {
  const trimmed = username.trim()
  const unchanged = (unchangedValue ?? '').trim().toLowerCase()
  const shouldCheck = trimmed !== '' && trimmed.toLowerCase() !== unchanged

  // The resolved verdict, tagged with the input it belongs to. A result whose
  // key no longer matches the current input is treated as stale (→ checking).
  const [resolved, setResolved] = useState<{
    key: string
    state: Resolved
  } | null>(null)

  useEffect(() => {
    if (!shouldCheck) return

    let cancelled = false
    const handle = setTimeout(async () => {
      const { data, error } = await client.users.checkUsernameAvailability(
        trimmed,
        excludeUserId
      )
      if (cancelled) return
      const state: Resolved =
        error || !data
          ? {
              status: 'unavailable',
              message: error?.message ?? 'Could not check username.',
            }
          : data.available
            ? { status: 'available', message: data.reason }
            : { status: 'unavailable', message: data.reason }
      setResolved({ key: trimmed, state })
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [shouldCheck, trimmed, excludeUserId])

  if (!shouldCheck) return { status: 'idle' }
  if (resolved && resolved.key === trimmed) return resolved.state
  return { status: 'checking' }
}
