import Link from 'next/link'
import { getWidgetPlatformFeatureKeys, type WidgetHost } from '@876/widgets'
import { ChevronRightIcon } from '@876/ui/icons'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { widgetCatalog } from '@/features/widgets/widget-catalog'
import { $876 } from '@/lib/876'

import {
  RegisterWidgetFlagsForm,
  type PendingWidget,
  type PendingFlag,
} from './_components/register-widget-flags-form'

export const metadata = { title: 'Register widget flags' }

const HOST_LABELS: Record<WidgetHost, string> = {
  console: 'Console',
  billing: '876 Billing',
  couriers: '876 Couriers',
  enterprise: '876 Enterprise',
  '876': '876',
}

/**
 * A widget is a code artifact — it is declared in the `@876/widgets` catalog,
 * not created from Console. What Console *can* add is the set of PostHog-backed
 * feature flags that gate it, which is why a catalog widget shows
 * "Missing: <slug>" until those flags exist. This page provisions them.
 */
export default async function NewWidgetFlagsPage() {
  const [featuresResult, appsResult] = await Promise.all([
    $876.features.list({ limit: 100, includeTag: 'widget' }),
    $876.apps.list({ limit: 100, clientType: 'public' }),
  ])

  const existingIdBySlug = new Map(
    (featuresResult.data?.data ?? []).map((feature) => [
      feature.slug,
      feature.id,
    ])
  )
  const appsByPrefix = new Map(
    (appsResult.data?.data ?? []).map((app) => [app.feature_prefix, app])
  )

  function resolveAppId(slug: string): string | null {
    for (const [prefix, app] of appsByPrefix) {
      if (prefix && slug.startsWith(`${prefix}_`)) return app.id
    }
    return null
  }

  const widgets: PendingWidget[] = widgetCatalog.map((widget) => {
    const scopes: { label: string; parent: string; widget: string }[] = []

    const platform = getWidgetPlatformFeatureKeys(widget)
    if (platform) {
      scopes.push({
        label: 'All apps',
        parent: platform.parent,
        widget: platform.widget,
      })
    }
    for (const [host, keys] of Object.entries(widget.features.apps)) {
      if (!keys) continue
      scopes.push({
        label: HOST_LABELS[host as WidgetHost],
        parent: keys.parent,
        widget: keys.widget,
      })
    }

    const flags: PendingFlag[] = []
    for (const scope of scopes) {
      if (!flags.some((flag) => flag.slug === scope.parent)) {
        flags.push({
          slug: scope.parent,
          parentSlug: null,
          appId: resolveAppId(scope.parent),
          name: `Widgets — ${scope.label}`,
          description: `Master switch for every widget in ${scope.label}.`,
          existingId: existingIdBySlug.get(scope.parent) ?? null,
        })
      }
      flags.push({
        slug: scope.widget,
        parentSlug: scope.parent,
        appId: resolveAppId(scope.widget),
        name: `${widget.name} — ${scope.label}`,
        description: `Gates the ${widget.name} widget in ${scope.label}.`,
        existingId: existingIdBySlug.get(scope.widget) ?? null,
      })
    }

    return {
      id: widget.id,
      name: widget.name,
      flags,
    }
  })

  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-[0.8125rem]">
        <Link
          href="/widgets"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Widgets
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <span className="font-medium">Register widget flags</span>
      </nav>

      <ResourceToolbar title="Register widget flags" />

      <RegisterWidgetFlagsForm widgets={widgets} />
    </Page>
  )
}
