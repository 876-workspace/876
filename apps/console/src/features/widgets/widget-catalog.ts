import {
  getWidgetAppFeatureKeys,
  getWidgetPlatformFeatureKeys,
  widgetCatalog as baseWidgetCatalog,
  type WidgetHost,
  type WidgetMetadata,
} from '@876/widgets'

export const CONSOLE_WIDGETS_FEATURE_SLUG = 'console_widgets'

export const liveLogsWidgetMetadata = {
  object: 'widget',
  id: 'live_logs',
  name: 'Live logs',
  description:
    'A Console-only view of recent platform audit events and request activity.',
  version: '1.0.0',
  visual: { kind: 'icon', icon: 'terminal' },
  distribution: 'host',
  /** Reads core audit via $876 — not Widgets Postgres. */
  dataOwner: 'external',
  ownership: 'workspace',
  defaultPanel: { width: 720, height: 520 },
  supportedHosts: ['console'],
  implementedHosts: ['console'],
  features: {
    apps: {
      console: {
        parent: 'console_widgets',
        widget: 'console_widgets_live_logs',
      },
    },
  },
  administration: {
    canListContent: false,
    canEditContent: false,
    canDeleteContent: false,
  },
} as const satisfies WidgetMetadata

export const widgetCatalog = [
  ...baseWidgetCatalog,
  liveLogsWidgetMetadata,
] as const satisfies readonly WidgetMetadata[]

export type WidgetId = (typeof widgetCatalog)[number]['id']

export function getWidgetRouteSlug(widget: WidgetMetadata) {
  return widget.id.replaceAll('_', '-')
}

export function getConsoleWidgetDetailHref(widget: WidgetMetadata) {
  return `/widgets/${getWidgetRouteSlug(widget)}`
}

export function getConsoleWidgetStatusFeatureSlug(widget: WidgetMetadata) {
  const platformKeys = getWidgetPlatformFeatureKeys(widget)
  const firstHost = widget.implementedHosts[0] as WidgetHost | undefined
  const hostKeys = firstHost
    ? getWidgetAppFeatureKeys(widget, firstHost)
    : undefined

  return platformKeys?.widget ?? hostKeys?.widget ?? null
}

export function getConsoleWidgetByRouteSlug(routeSlug: string) {
  return widgetCatalog.find(
    (widget) => getWidgetRouteSlug(widget) === routeSlug
  )
}
