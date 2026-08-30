import { platform } from '@/lib/services/platform'
import 'server-only'

import { cache } from 'react'
import type { AdminApp } from '@876/admin'
import type { AppError } from '@876/core/types/errors'

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
 *
 * The failure is returned, not collapsed to null: callers log it, and a bare
 * null produced `errorCode: null, errorMessage: null` outage lines that named
 * the failing call and nothing about why it failed.
 */
export const listConsoleApps = cache(
  async (): Promise<{ apps: AdminApp[] | null; error: AppError | null }> => {
    const { data, error } = await platform.apps.list({
      limit: 100,
      clientType: 'public',
    })
    if (error || !data)
      return {
        apps: null,
        error: error ?? {
          code: 'admin/empty-response',
          message: 'apps.list returned no data and no error.',
        },
      }
    return { apps: data.data, error: null }
  }
)
