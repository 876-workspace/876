'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { AdminOrganization, AdminUser } from '@876/admin'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Input } from '@876/ui/input'
import { Spinner } from '@876/ui/spinner'
import { cn } from '@876/ui/lib/utils'

import { client } from '@/lib/client'

export type Principal = {
  id: string
  /** Display name — a person's name, or an org's name. */
  name: string
  /** Email, slug, or another disambiguating identifier. */
  detail: string
  avatarUrl: string | null
}

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 250

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const letters = parts.map((part) => part[0] ?? '').join('')
  return letters.toUpperCase() || '?'
}

function fromUser(user: AdminUser): Principal {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')
  return {
    id: user.id,
    name: fullName || user.username || user.email,
    detail: user.email,
    avatarUrl: user.avatar,
  }
}

function fromOrganization(org: AdminOrganization): Principal {
  return {
    id: org.id,
    name: org.name ?? org.slug,
    detail: org.slug,
    avatarUrl: org.logo_url,
  }
}

/**
 * Search-to-add picker for an override target.
 *
 * Overrides are deliberately *not* backed by a list of every user or every
 * organization: an admin grants access to a principal they already have in
 * mind, and enumerating the whole directory to find them scales badly and
 * buries the handful of principals that actually carry an override.
 */
export function PrincipalSearch({
  kind,
  excludeIds,
  onSelect,
  disabled = false,
}: {
  kind: 'user' | 'organization'
  /** Principals that already carry an override, hidden from results. */
  excludeIds: readonly string[]
  onSelect: (principal: Principal) => void
  disabled?: boolean
}) {
  const inputId = useId()
  const listboxId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Principal[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const trimmed = query.trim()

  useEffect(() => {
    // Nothing is cleared here: state set synchronously in an effect body
    // cascades an extra render. Below-threshold queries are handled by
    // deriving the displayed values instead, so stale results simply never
    // reach the panel.
    if (trimmed.length < MIN_QUERY_LENGTH) return

    let cancelled = false
    const timer = setTimeout(async () => {
      setSearching(true)
      if (kind === 'user') {
        const { data, error: searchError } = await client.users.search(trimmed)
        if (cancelled) return

        setSearching(false)
        if (searchError) {
          setError(searchError.message)
          setResults([])
          return
        }

        setError(null)
        setResults((data ?? []).map(fromUser))
        return
      }

      const { data, error: searchError } = await client.orgs.search(trimmed)
      if (cancelled) return

      setSearching(false)
      if (searchError) {
        setError(searchError.message)
        setResults([])
        return
      }

      setError(null)
      setResults((data ?? []).map(fromOrganization))
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [trimmed, kind])

  // Dismiss on outside click so the results panel never strands over the page.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Derived, not stored: a query below the threshold shows nothing regardless
  // of what the last completed search left behind.
  const ready = trimmed.length >= MIN_QUERY_LENGTH
  const matches = ready ? results : []
  const activeError = ready ? error : null
  const busy = ready && searching
  const visible = matches.filter((entry) => !excludeIds.includes(entry.id))
  const showPanel = open && ready

  function choose(principal: Principal) {
    onSelect(principal)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={inputId} className="sr-only">
        {kind === 'user' ? 'Search users' : 'Search organizations'}
      </label>
      <Input
        id={inputId}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listboxId}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        placeholder={
          kind === 'user' ? 'Search by name or email' : 'Search by name or slug'
        }
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
      />

      {showPanel && (
        <div
          id={listboxId}
          role="listbox"
          className="876-card absolute z-50 mt-1 max-h-72 w-full overflow-y-auto p-1 shadow-lg"
        >
          {busy && (
            <p className="text-muted-foreground flex items-center gap-2 px-3 py-2.5 text-sm">
              <Spinner className="size-3.5" />
              Searching
            </p>
          )}

          {!busy && activeError && (
            <p className="text-destructive px-3 py-2.5 text-sm">
              {activeError}
            </p>
          )}

          {!busy && !activeError && visible.length === 0 && (
            <p className="text-muted-foreground px-3 py-2.5 text-sm">
              {matches.length > 0
                ? 'Everyone matching already has an override.'
                : 'No matches.'}
            </p>
          )}

          {!busy &&
            !activeError &&
            visible.map((principal) => (
              <button
                key={principal.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => choose(principal)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left',
                  'hover:bg-muted focus-visible:bg-muted focus-visible:outline-none'
                )}
              >
                <Avatar size="sm">
                  {principal.avatarUrl ? (
                    <AvatarImage src={principal.avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback>{initials(principal.name)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {principal.name}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {principal.detail}
                  </span>
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
