'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { OrgAvatar } from '@876/ui/org-avatar'
import { KeyRound } from '@876/ui/icons'

import { client } from '@/lib/client'
import type { ClientResult } from '@/types/api'
import type { UserIdentity } from '@/types/member'
import { Fact, ProviderRow, StatusBadge } from './overview-ui'

/**
 * Lazy-loaded accordion bodies for the user overview. Each body is rendered only
 * when its accordion opens (Base UI unmounts closed panels), so these components
 * fetch on mount - keeping the page's initial load to the user record + the
 * cheap counts. A module-level cache keeps reopening a panel instant.
 */

const cache = new Map<string, unknown>()

type LazyState<T> = { data: T | null; loading: boolean; error: string | null }

/**
 * Fetch `loader()` once on mount, memoizing the result under `key` so closing
 * and reopening the panel does not refetch. State is seeded from the cache on a
 * hit (no refetch); on a miss the fetch runs in the effect and only sets state
 * from its async callback. `key` is derived from the user id, which is stable
 * for the component's lifetime, so the effect runs exactly once.
 */
function useLazyResource<T>(
  key: string,
  loader: () => Promise<ClientResult<T>>
): LazyState<T> {
  const [state, setState] = useState<LazyState<T>>(() =>
    cache.has(key)
      ? { data: cache.get(key) as T, loading: false, error: null }
      : { data: null, loading: true, error: null }
  )

  useEffect(() => {
    if (cache.has(key)) return
    let active = true
    loader().then(({ data, error }) => {
      if (!active) return
      if (error) {
        setState({ data: null, loading: false, error: error.message })
        return
      }
      cache.set(key, data)
      setState({ data, loading: false, error: null })
    })
    return () => {
      active = false
    }
    // loader is a fresh closure each render but only captures the stable userId
    // encoded in `key`; depending on `key` alone keeps this a single fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}

function SkeletonLine({ className }: { className?: string }) {
  return (
    <span
      className={`bg-muted block animate-pulse rounded ${className ?? 'h-3 w-24'}`}
    />
  )
}

function ErrorHint({ children }: { children: string }) {
  return <p className="text-muted-foreground py-2 text-xs">{children}</p>
}

/** The six consumer-profile facts inside the Account accordion. */
export function LazyProfileFacts({ userId }: { userId: string }) {
  const { data, loading } = useLazyResource(`profile:${userId}`, () =>
    client.users.retrieveProfile(userId)
  )

  const fields: { label: string; value: string | null | undefined }[] = [
    { label: 'Nickname', value: data?.nickname },
    { label: 'Gender', value: data?.gender },
    { label: 'Phone', value: data?.phone_number },
    { label: 'Date of birth', value: data?.date_of_birth },
    { label: 'Language', value: data?.language },
    { label: 'Timezone', value: data?.timezone },
  ]

  return (
    <>
      {fields.map((field) => (
        <Fact
          key={field.label}
          label={field.label}
          value={loading ? <SkeletonLine /> : (field.value ?? '-')}
        />
      ))}
    </>
  )
}

/** Linked sign-in providers + email-verified state in the Authentication accordion. */
export function LazyAuthAccounts({
  userId,
  emailVerified,
}: {
  userId: string
  emailVerified: boolean
}) {
  const { data, loading, error } = useLazyResource(`accounts:${userId}`, () =>
    client.users.listAccounts(userId)
  )

  return (
    <div className="space-y-3">
      <ul className="space-y-2.5">
        {loading ? (
          <li className="border-876-surface-border bg-background/60 flex items-center gap-2.5 rounded-md border px-2.5 py-2">
            <span className="bg-muted size-7 shrink-0 animate-pulse rounded-md" />
            <SkeletonLine className="h-3 w-28" />
          </li>
        ) : error ? (
          <ErrorHint>Could not load sign-in methods.</ErrorHint>
        ) : data && data.length > 0 ? (
          data.map((account) => (
            <ProviderRow key={account.id} account={account} />
          ))
        ) : (
          <li className="border-876-surface-border bg-background/60 flex items-center gap-2.5 rounded-md border px-2.5 py-2">
            <span className="border-876-surface-border bg-background flex size-7 shrink-0 items-center justify-center rounded-md border">
              <KeyRound className="text-muted-foreground size-3.5" />
            </span>
            <span className="text-sm font-medium">Email &amp; password</span>
          </li>
        )}
      </ul>
      <div className="flex items-center justify-between gap-3 border-t pt-3">
        <span className="text-muted-foreground text-sm">Email verified</span>
        <span className="text-sm font-medium">
          {emailVerified ? 'Yes' : 'No'}
        </span>
      </div>
    </div>
  )
}

/** Org memberships (with org brand + role + status) for the Enterprise app row. */
export function LazyEnterpriseIdentities({ userId }: { userId: string }) {
  const { data, loading, error } = useLazyResource<UserIdentity[]>(
    `identities:${userId}`,
    () => client.users.listIdentities(userId)
  )

  if (loading) {
    return (
      <ul className="space-y-2">
        {[0, 1].map((i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="bg-muted size-6 shrink-0 animate-pulse rounded-md" />
            <SkeletonLine className="h-3 w-32" />
          </li>
        ))}
      </ul>
    )
  }
  if (error) return <ErrorHint>Could not load organizations.</ErrorHint>
  if (!data || data.length === 0) return null

  return (
    <ul className="space-y-2">
      {data.map(({ membership, org }) => (
        <li key={membership.id} className="flex items-center gap-2">
          <OrgAvatar
            name={org?.name}
            src={org?.logo_url}
            size="sm"
            className="size-6 rounded-md text-[0.625rem]"
          />
          <span className="min-w-0 flex-1">
            <Link
              href={org ? `/orgs/${org.slug}` : '#'}
              className="block truncate text-sm hover:underline"
            >
              {org?.short_name || org?.name || membership.organization_id}
            </Link>
            <span className="text-muted-foreground block truncate text-xs capitalize">
              {membership.role}
            </span>
          </span>
          <StatusBadge status={membership.status} />
        </li>
      ))}
    </ul>
  )
}
