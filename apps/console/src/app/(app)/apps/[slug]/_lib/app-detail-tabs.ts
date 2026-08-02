import type { AdminApp } from '@876/admin'
import type { RouteTabItem } from '@876/ui/route-tabs'

export function getAppTabs(
  appKind: AdminApp['app_kind'],
  base: string
): RouteTabItem[] {
  const shared = {
    overview: { label: 'Overview', href: base, exact: true },
    modules: { label: 'Modules', href: `${base}/modules` },
    widgets: { label: 'Widgets', href: `${base}/widgets` },
    features: { label: 'Feature Flags', href: `${base}/features` },
    settings: { label: 'Settings', href: `${base}/settings` },
  } satisfies Record<string, RouteTabItem>

  if (appKind === 'product')
    return [
      shared.overview,
      shared.modules,
      { label: 'Plans', href: `${base}/plans` },
      { label: 'Subscribers', href: `${base}/subscribers` },
      shared.widgets,
      shared.features,
      { label: 'Audit', href: `${base}/audit` },
      { label: 'Provisioning', href: `${base}/provisioning` },
      shared.settings,
    ]

  if (appKind === 'platform')
    return [
      shared.overview,
      shared.modules,
      shared.widgets,
      shared.features,
      shared.settings,
    ]

  return [shared.overview, shared.widgets, shared.features, shared.settings]
}
