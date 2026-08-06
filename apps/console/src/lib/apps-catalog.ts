import 'server-only'

import { cache } from 'react'
import type { AdminApp } from '@876/admin'

import { $876 } from '@/lib/876'

/**
 * The first-party app catalog, fetched once per request.
 *
 * Two unrelated callers needed this same list on a single render — the shell's
 * feature-flag resolution, to find the Console app and evaluate against its id,
 * and the app detail routes, to resolve a slug — and both issued a byte-identical
 * `apps.list({ limit: 100, clientType: 'public' })`. Two round trips for one
 * answer, on every app page.
 *
 * No kind filter: the list spans internal, platform and product apps, because
 * filtering to `internal` is what once made /apps/876-couriers 404.
 */
export const listConsoleApps = cache(async (): Promise<AdminApp[] | null> => {
  const { data, error } = await $876.apps.list({
    limit: 100,
    clientType: 'public',
  })
  if (error || !data) return null
  return data.data
})
