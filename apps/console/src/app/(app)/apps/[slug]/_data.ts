import { workspace } from '@/lib/services/workspace'
import { platform } from '@/lib/services/platform'
import type { AdminSubscription } from '@876/platform/compat'
import { cache } from 'react'

import { listConsoleApps } from '@/lib/apps-catalog'

export const resolveApp = cache(async (slug: string) => {
  // Resolve by the real stored slug across ALL first-party kinds
  // (internal/platform/product) — not just `internal`, which is why
  // /apps/876-couriers, /apps/876-enterprise, etc. previously 404'd. The
  // detail layout gates commercial tabs by `app_kind`, so no kind filter here.
  //
  // Shares the per-request catalog with the shell's feature-flag resolution,
  // which was issuing the identical list call on the same render.
  const { apps } = await listConsoleApps()
  return apps?.find((a) => a.slug === slug) ?? null
})

export const resolveProduct = cache(async (appId: string, slugOrId: string) => {
  const { data } = await platform.products.list({ appId })
  return (
    data?.data.find(
      (product) => product.id === slugOrId || product.slug === slugOrId
    ) ?? null
  )
})

/**
 * Returns complete Core entitlement subscriptions for one app.
 *
 * `/apps/:appId/subscriptions` is currently only a lightweight app-scoped
 * summary despite the admin SDK historically typing it as `AdminSubscription`.
 * In particular, production responses omit `items`, so callers that use the
 * advertised shape can crash while rendering. Hydrate those summaries through
 * Core's admin organization-subscription batch endpoint, whose canonical
 * serializer includes product/price items.
 *
 * The summary call still determines which organizations belong to this app;
 * one batch request then replaces each summary with the complete entitlement.
 * If that hydration is unavailable, normalize the unsafe fields instead of
 * letting a malformed upstream response take down Console.
 */
export async function listCompleteAppSubscriptions(appId: string): Promise<{
  data: AdminSubscription[]
  error: { code: string; message: string } | null
}> {
  const summariesResult = await workspace.apps.entitlements.list(appId)
  if (summariesResult.error) return { data: [], error: summariesResult.error }

  const summaries = summariesResult.data ?? []
  if (summaries.length === 0) return { data: [], error: null }

  const organizationIds = [
    ...new Set(summaries.map((subscription) => subscription.organization_id)),
  ]
  const hydratedResult = await workspace.apps.entitlements.list({
    organizationIds,
  })

  if (hydratedResult.error) {
    console.error(
      '[console.apps.subscriptions] batch hydration failed:',
      appId,
      hydratedResult.error.message
    )
    return {
      data: summaries.map(
        (subscription) =>
          ({
            ...subscription,
            items: Array.isArray(subscription.items) ? subscription.items : [],
            start_date: subscription.start_date ?? null,
          }) as AdminSubscription
      ),
      error: hydratedResult.error,
    }
  }

  const hydratedById = new Map<string, AdminSubscription>(
    (hydratedResult.data?.data ?? [])
      .filter((subscription) => subscription.app_id === appId)
      .map((subscription) => [subscription.id, subscription])
  )

  return {
    data: summaries.map(
      (subscription) =>
        hydratedById.get(subscription.id) ??
        ({
          ...subscription,
          items: Array.isArray(subscription.items) ? subscription.items : [],
          start_date: subscription.start_date ?? null,
        } as AdminSubscription)
    ),
    error: null,
  }
}
