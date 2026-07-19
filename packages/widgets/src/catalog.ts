export type WidgetHost =
  | 'console'
  | 'billing'
  | 'couriers'
  | 'enterprise'
  | '876'

export const WIDGET_HOST_APP_SLUGS: Record<WidgetHost, string> = {
  console: 'console',
  billing: '876-billing',
  couriers: '876-couriers',
  enterprise: '876-enterprise',
  '876': '876-consumer',
}

/**
 * Where the widget may appear (host dock catalog) — independent of data ownership.
 * - shared: portable across apps via @876/widgets catalog
 * - host: only the owning app's local catalog
 */
export type WidgetDistribution = 'shared' | 'host'

/**
 * Which bounded context owns authoritative persisted content.
 * - widgets: Widgets Postgres via apps/widgets-api
 * - external: another domain (core audit, couriers, billing, …)
 */
export type WidgetDataOwner = 'widgets' | 'external'

export type WidgetVisual =
  | { kind: 'icon'; icon: 'notepad' | 'terminal' | 'knowledge_base' }
  | { kind: 'image'; src: string; alt: string }

export interface WidgetFeatureKeys {
  parent: string
  widget: string
}

interface WidgetMetadataBase {
  object: 'widget'
  id: string
  name: string
  description: string
  version: string
  visual: WidgetVisual
  ownership: 'account' | 'organization' | 'workspace'
  /** Independent of distribution: where authoritative content lives. */
  dataOwner: WidgetDataOwner
  defaultPanel: { width: number; height: number }
  supportedHosts: readonly WidgetHost[]
  implementedHosts: readonly WidgetHost[]
  administration: {
    canListContent: boolean
    canEditContent: boolean
    canDeleteContent: boolean
  }
}

export type WidgetMetadata = WidgetMetadataBase &
  (
    | {
        distribution: 'shared'
        features: {
          platform: WidgetFeatureKeys
          apps: Partial<Record<WidgetHost, WidgetFeatureKeys>>
        }
      }
    | {
        distribution: 'host'
        features: {
          platform?: never
          apps: Partial<Record<WidgetHost, WidgetFeatureKeys>>
        }
      }
  )

export const notepadWidgetMetadata = {
  object: 'widget',
  id: 'notepad',
  name: 'Notepad',
  description:
    'Sticky-style notes with Editor.js rich text, colors, pin-to-top, search, and auto-save that follow your 876 account across apps.',
  version: '2.0.0',
  visual: { kind: 'icon', icon: 'notepad' },
  distribution: 'shared',
  dataOwner: 'widgets',
  ownership: 'account',
  defaultPanel: { width: 384, height: 520 },
  supportedHosts: ['console', 'billing', 'couriers', 'enterprise', '876'],
  implementedHosts: ['console', 'billing', 'couriers'],
  features: {
    platform: {
      parent: 'platform_widgets',
      widget: 'platform_widgets_notepad',
    },
    apps: {
      console: {
        parent: 'console_widgets',
        widget: 'console_widgets_notepad',
      },
      billing: {
        parent: 'billing_widgets',
        widget: 'billing_widgets_notepad',
      },
      couriers: {
        parent: 'couriers_widgets',
        widget: 'couriers_widgets_notepad',
      },
    },
  },
  administration: {
    canListContent: true,
    canEditContent: true,
    canDeleteContent: true,
  },
} as const satisfies WidgetMetadata

export const knowledgeBaseWidgetMetadata = {
  object: 'widget',
  id: 'knowledge_base',
  name: 'Knowledge base',
  description:
    'In-app help articles with categories, search, and bookmarks. Content is filtered by app; shared ecosystem topics can appear on multiple hosts. Read-only in the dock; authored in Console.',
  version: '1.0.0',
  visual: { kind: 'icon', icon: 'knowledge_base' },
  distribution: 'shared',
  dataOwner: 'widgets',
  ownership: 'workspace',
  defaultPanel: { width: 440, height: 640 },
  supportedHosts: ['console', 'billing', 'couriers', 'enterprise', '876'],
  implementedHosts: ['console', 'billing', 'couriers'],
  features: {
    platform: {
      parent: 'platform_widgets',
      widget: 'platform_widgets_knowledge_base',
    },
    apps: {
      console: {
        parent: 'console_widgets',
        widget: 'console_widgets_knowledge_base',
      },
      billing: {
        parent: 'billing_widgets',
        widget: 'billing_widgets_knowledge_base',
      },
      couriers: {
        parent: 'couriers_widgets',
        widget: 'couriers_widgets_knowledge_base',
      },
    },
  },
  administration: {
    canListContent: true,
    canEditContent: true,
    canDeleteContent: true,
  },
} as const satisfies WidgetMetadata

export const widgetCatalog = [
  notepadWidgetMetadata,
  knowledgeBaseWidgetMetadata,
] as const

export function getWidgetAppFeatureKeys(
  widget: WidgetMetadata,
  host: WidgetHost
): WidgetFeatureKeys | undefined {
  return widget.features.apps[host]
}

export function getWidgetPlatformFeatureKeys(
  widget: WidgetMetadata
): WidgetFeatureKeys | undefined {
  return widget.distribution === 'shared' ? widget.features.platform : undefined
}

export function getWidgetFeatureSlugs(
  widget: WidgetMetadata
): readonly string[] {
  const featureKeys = [
    widget.features.platform,
    ...Object.values(widget.features.apps),
  ].filter((keys): keys is WidgetFeatureKeys => Boolean(keys))

  return [
    ...new Set(featureKeys.flatMap(({ parent, widget }) => [parent, widget])),
  ]
}

export function getRequiredWidgetFeatureSlugs(
  widget: WidgetMetadata,
  host: WidgetHost
): readonly string[] {
  const app = getWidgetAppFeatureKeys(widget, host)
  if (!app) return []
  if (widget.distribution === 'host') return [app.parent, app.widget]

  const platform = widget.features.platform
  return [platform.parent, platform.widget, app.parent, app.widget]
}

export function isWidgetEnabled(
  widget: WidgetMetadata,
  host: WidgetHost,
  enabledFeatureSlugs: ReadonlySet<string>
): boolean {
  const required = getRequiredWidgetFeatureSlugs(widget, host)
  return (
    required.length > 0 &&
    required.every((featureSlug) => enabledFeatureSlugs.has(featureSlug))
  )
}

export function getWidgetMetadata(
  widgetId: string
): WidgetMetadata | undefined {
  return widgetCatalog.find((widget) => widget.id === widgetId)
}

/** True when content is persisted in the Widgets bounded context. */
export function isWidgetsDataOwner(widget: WidgetMetadata): boolean {
  return widget.dataOwner === 'widgets'
}
