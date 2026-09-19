import { platform } from '@/lib/clients/platform'
import 'server-only'

import { cache } from 'react'
import type { AdminApp } from '@876/platform/compat'
import type { AppError } from '@876/core/types/errors'
import { collectCatalogPages } from '@/lib/console/catalog-pages'

/**
 * The first-party app catalog, fetched once per request.
 *
 * The shell's feature evaluation and app detail routes share the complete
 * catalog, including every page and every first-party app kind. Failures remain
 * distinguishable from an app that does not exist.
 */
export const listConsoleApps = cache(
  async (): Promise<{ apps: AdminApp[] | null; error: AppError | null }> => {
    const { data, error } = await collectCatalogPages((startingAfter) =>
      platform.apps.list({ limit: 100, clientType: 'public', startingAfter })
    )
    return { apps: data, error }
  }
)
