import type { AdminFeature } from '@876/admin'
import {
  getWidgetPlatformFeatureKeys,
  WIDGET_HOST_APP_SLUGS,
  type WidgetHost,
  type WidgetMetadata,
} from '@876/widgets'

import {
  FeatureAccessBoard,
  type AccessFlag,
  type AccessScope,
} from '@/components/access/feature-access-board'
import { loadGrants, toAccessFlag } from '@/components/access/to-access-flag'
import { $876 } from '@/lib/876'

const HOST_LABELS: Record<WidgetHost, string> = {
  console: 'Console',
  billing: '876 Billing',
  couriers: '876 Couriers',
  enterprise: '876 Enterprise',
  '876': '876',
}

/**
 * Access grouped by the app it applies to. A shared widget carries a platform
 * key plus one key per host, so a single toggle would hide which of four flags
 * an admin had just changed — every flag that applies is shown, with children
 * nested under the master they AND with.
 */
export async function WidgetAccessList({ widget }: { widget: WidgetMetadata }) {
  const [featuresResult, appsResult] = await Promise.all([
    $876.features.list({ limit: 100, includeTag: 'widget' }),
    $876.apps.list({ limit: 100, clientType: 'public' }),
  ])

  const bySlug = new Map(
    (featuresResult.data?.data ?? []).map((feature) => [feature.slug, feature])
  )
  const appsBySlug = new Map(
    (appsResult.data?.data ?? []).map((app) => [app.slug, app])
  )

  const platform = getWidgetPlatformFeatureKeys(widget)
  const scopeSpecs: {
    key: string
    label: string
    logoUrl: string | null
    parent: string
    widgetKey: string
  }[] = []

  if (platform) {
    scopeSpecs.push({
      key: 'platform',
      label: 'All apps',
      logoUrl: null,
      parent: platform.parent,
      widgetKey: platform.widget,
    })
  }
  for (const [host, keys] of Object.entries(widget.features.apps)) {
    if (!keys) continue
    const app = appsBySlug.get(WIDGET_HOST_APP_SLUGS[host as WidgetHost])
    scopeSpecs.push({
      key: host,
      label: app?.name ?? HOST_LABELS[host as WidgetHost],
      logoUrl: app?.logo_url ?? null,
      parent: keys.parent,
      widgetKey: keys.widget,
    })
  }

  // One grants call per resolved flag. The set is small and bounded by the
  // widget's own key list, so this is a handful of requests, not a fan-out
  // over the directory the way the previous surface worked.
  const resolved = scopeSpecs.flatMap((spec) =>
    [spec.parent, spec.widgetKey]
      .map((slug) => bySlug.get(slug))
      .filter((feature): feature is AdminFeature => feature !== undefined)
  )
  const grantsById = await loadGrants(resolved, (id) =>
    $876.features.retrieveGrants(id)
  )

  const scopes: AccessScope[] = scopeSpecs.map((spec) => {
    const flags: AccessFlag[] = []
    const master = bySlug.get(spec.parent)
    if (master)
      flags.push(toAccessFlag(master, grantsById.get(master.id) ?? null, false))

    const widgetFlag = bySlug.get(spec.widgetKey)
    if (widgetFlag)
      flags.push(
        toAccessFlag(widgetFlag, grantsById.get(widgetFlag.id) ?? null, true)
      )

    return {
      key: spec.key,
      label: spec.label,
      logoUrl: spec.logoUrl,
      flags,
    }
  })

  if (scopes.every((scope) => scope.flags.length === 0)) {
    return (
      <div className="876-card p-5">
        <p className="text-muted-foreground text-sm">
          No feature flags are registered for this widget yet.
        </p>
      </div>
    )
  }

  return <FeatureAccessBoard scopes={scopes} />
}
