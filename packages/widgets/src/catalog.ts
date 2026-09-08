export type WidgetHost =
  'console' | 'billing' | 'couriers' | 'enterprise' | '876' | 'invoice'

export const WIDGET_HOST_APP_SLUGS: Record<WidgetHost, string> = {
  console: 'console',
  billing: '876-billing',
  couriers: '876-couriers',
  enterprise: '876-enterprise',
  '876': '876-consumer',
  invoice: '876-invoice',
}

export const WIDGET_HOST_LABELS: Record<WidgetHost, string> = {
  console: 'Console',
  billing: '876 Billing',
  couriers: '876 Couriers',
  enterprise: '876 Enterprise',
  '876': '876',
  invoice: '876 Invoice',
}

/**
 * Temporary, explicit compatibility aliases for the platform naming migration.
 * New definitions and writes use only the canonical key. Remove these aliases
 * after PostHog/local migration verification confirms no legacy flag remains.
 */
const LEGACY_WIDGET_FEATURE_SLUGS: Readonly<Record<string, readonly string[]>> =
  {
    'platform-widgets': ['platform_widgets'],
    'platform-widgets-notepad': [
      'platform_widgets_notepad',
      'platform_widgets_notes',
    ],
    'platform-widgets-chat': ['platform_widgets_chat'],
    'console-widgets': ['console_widgets'],
    'console-widgets-notepad': [
      'console_widgets_notepad',
      'console_widgets_notes',
    ],
    'console-widgets-chat': ['console_widgets_chat'],
    'billing-widgets': ['billing_widgets'],
    'billing-widgets-notepad': [
      'billing_widgets_notepad',
      'billing_widgets_notes',
    ],
    'billing-widgets-chat': ['billing_widgets_chat'],
    'couriers-widgets': ['couriers_widgets'],
    'couriers-widgets-notepad': ['couriers_widgets_notepad'],
    'couriers-widgets-chat': ['couriers_widgets_chat'],
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

export type WidgetSurface = 'panel' | 'secondary-rail'

export type WidgetVisual =
  | { kind: 'icon'; icon: 'notepad' | 'work' | 'terminal' | 'chat' }
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
  /** Where the host renders the widget after feature resolution. */
  surface: WidgetSurface
  defaultPanel: { width: number; height: number }
  supportedHosts: readonly WidgetHost[]
  implementedHosts: readonly WidgetHost[]
  /** Host-app permissions that must be effective before the surface is shown. */
  permissions?: Partial<Record<WidgetHost, readonly string[]>>
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
  surface: 'panel',
  ownership: 'account',
  defaultPanel: { width: 384, height: 520 },
  supportedHosts: ['console', 'billing', 'couriers', 'enterprise', '876'],
  implementedHosts: ['console', 'billing', 'couriers'],
  features: {
    platform: {
      parent: 'platform-widgets',
      widget: 'platform-widgets-notepad',
    },
    apps: {
      console: {
        parent: 'console-widgets',
        widget: 'console-widgets-notepad',
      },
      billing: {
        parent: 'billing-widgets',
        widget: 'billing-widgets-notepad',
      },
      couriers: {
        parent: 'couriers-widgets',
        widget: 'couriers-widgets-notepad',
      },
    },
  },
  administration: {
    canListContent: true,
    canEditContent: true,
    canDeleteContent: true,
  },
} as const satisfies WidgetMetadata

export const workWidgetMetadata = {
  object: 'widget',
  id: 'work',
  name: '876 Work',
  description:
    'Your calendar events, tasks, reminders, and schedule across the 876 productivity plane.',
  version: '1.0.0',
  visual: { kind: 'icon', icon: 'work' },
  distribution: 'shared',
  dataOwner: 'external',
  surface: 'panel',
  ownership: 'organization',
  defaultPanel: { width: 520, height: 620 },
  supportedHosts: ['invoice', 'billing'],
  implementedHosts: ['invoice'],
  permissions: {
    invoice: ['my-work.view'],
  },
  features: {
    platform: {
      parent: 'platform-widgets',
      widget: 'platform-widgets-work',
    },
    apps: {
      invoice: {
        parent: 'invoice-widgets',
        widget: 'invoice-widgets-work',
      },
    },
  },
  administration: {
    canListContent: false,
    canEditContent: false,
    canDeleteContent: false,
  },
} as const satisfies WidgetMetadata

export const chatWidgetMetadata = {
  object: 'widget',
  id: 'chat',
  name: '876 Chat',
  description:
    'Shared assistant rail controlled through the same platform, app, organization, and user feature hierarchy as other widgets.',
  version: '1.0.0',
  visual: { kind: 'icon', icon: 'chat' },
  distribution: 'shared',
  dataOwner: 'external',
  surface: 'secondary-rail',
  ownership: 'account',
  defaultPanel: { width: 384, height: 520 },
  supportedHosts: ['console', 'billing', 'couriers'],
  implementedHosts: ['console', 'billing', 'couriers'],
  features: {
    platform: {
      parent: 'platform-widgets',
      widget: 'platform-widgets-chat',
    },
    apps: {
      console: {
        parent: 'console-widgets',
        widget: 'console-widgets-chat',
      },
      billing: {
        parent: 'billing-widgets',
        widget: 'billing-widgets-chat',
      },
      couriers: {
        parent: 'couriers-widgets',
        widget: 'couriers-widgets-chat',
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
  notepadWidgetMetadata,
  workWidgetMetadata,
  chatWidgetMetadata,
] as const

export type WidgetId = (typeof widgetCatalog)[number]['id']

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

function hasFeatureSlug(
  enabledFeatureSlugs: ReadonlySet<string>,
  canonicalSlug: string
): boolean {
  if (enabledFeatureSlugs.has(canonicalSlug)) return true
  return (LEGACY_WIDGET_FEATURE_SLUGS[canonicalSlug] ?? []).some((legacySlug) =>
    enabledFeatureSlugs.has(legacySlug)
  )
}

export function isWidgetEnabled(
  widget: WidgetMetadata,
  host: WidgetHost,
  enabledFeatureSlugs: ReadonlySet<string>
): boolean {
  if (
    !widget.supportedHosts.includes(host) ||
    !widget.implementedHosts.includes(host)
  ) {
    return false
  }

  const required = getRequiredWidgetFeatureSlugs(widget, host)
  return (
    required.length > 0 &&
    required.every((featureSlug) =>
      hasFeatureSlug(enabledFeatureSlugs, featureSlug)
    )
  )
}

export function resolveEnabledWidgetIds(
  host: WidgetHost,
  enabledFeatureSlugs: ReadonlySet<string>
): WidgetId[] {
  return widgetCatalog
    .filter(
      (widget) =>
        widget.surface === 'panel' &&
        isWidgetEnabled(widget, host, enabledFeatureSlugs)
    )
    .map((widget) => widget.id)
}

export function resolveAccessibleWidgetIds(
  host: WidgetHost,
  enabledWidgetIds: readonly string[],
  effectivePermissions: ReadonlySet<string>
): WidgetId[] {
  const enabled = new Set(enabledWidgetIds)
  return widgetCatalog
    .filter((widget) => {
      if (widget.surface !== 'panel' || !enabled.has(widget.id)) return false
      const required = widget.permissions?.[host] ?? []
      return required.every((permission) => effectivePermissions.has(permission))
    })
    .map((widget) => widget.id)
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
