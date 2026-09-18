'use client'

/**
 * Per-viewer dismissal memory for announcements.
 *
 * Kept in `localStorage`, which is deliberately a per-viewer convenience and
 * never the source of truth: it is unreadable in a private window, can throw,
 * and never reaches another device — so a viewer who cannot persist a
 * dismissal simply sees the bar again. Exposed as an external store so the
 * region can subscribe without writing state from an effect.
 */

const KEY = 'announcements:dismissed:v1'
const EMPTY: readonly string[] = []

let snapshot: readonly string[] | null = null
const listeners = new Set<() => void>()

function read(): readonly string[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return EMPTY

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return EMPTY

    const ids = parsed.filter(
      (value): value is string => typeof value === 'string'
    )
    return ids.length > 0 ? ids : EMPTY
  } catch {
    return EMPTY
  }
}

export function getDismissedSnapshot(): readonly string[] {
  snapshot ??= read()
  return snapshot
}

/** Server render knows nothing about this viewer, so nothing is dismissed. */
export function getDismissedServerSnapshot(): readonly string[] {
  return EMPTY
}

export function subscribeToDismissed(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function dismissAnnouncement(id: string): void {
  const current = getDismissedSnapshot()
  if (current.includes(id)) return

  snapshot = [...current, id]

  try {
    window.localStorage.setItem(KEY, JSON.stringify(snapshot))
  } catch {
    /* see read() */
  }

  for (const listener of listeners) listener()
}

/** Test seam: forgets both the cached snapshot and the stored value. */
export function resetDismissedAnnouncements(): void {
  snapshot = null
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* see read() */
  }
  for (const listener of listeners) listener()
}
