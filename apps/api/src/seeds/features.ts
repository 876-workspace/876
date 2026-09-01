import { getSettings } from '@/config'
import { getLogger } from '@/platform/logger'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'
import { getPostHogClient, PostHogClient } from '@/providers/posthog/client'

import {
  createFeature,
  findAppBySlug,
  findAnyLegacyFeature,
  copyFeatureGrants,
  findCompletedArchive,
  findFeatureById,
  findFeatureBySlug,
  updateFeature,
} from './features.repository'

const log = getLogger('seeds:features')
const FEATURE_SLUG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

export type FeatureSeed = {
  slug: string
  name: string
  description: string
  parentSlug?: string
  defaultEnabled?: boolean
  tags?: string[]
  /** Explicit historical aliases. Never derive these with `_` -> `-`. */
  legacySlugs?: string[]
  /** Canonical feature slug whose enabled/grant state initializes a new flag. */
  copyStateFromSlug?: string
}

export const PLATFORM_FEATURE_SEEDS: readonly FeatureSeed[] = [
  {
    slug: 'platform-widgets',
    name: 'Shared widgets',
    description: 'Global master switch for widgets shared across 876 apps.',
    tags: ['widget'],
    legacySlugs: ['platform_widgets'],
  },
  {
    slug: 'platform-widgets-notepad',
    name: 'Shared Notepad widget',
    description: 'Global switch for the account-owned Notepad widget.',
    parentSlug: 'platform-widgets',
    tags: ['widget'],
    legacySlugs: ['platform_widgets_notepad', 'platform_widgets_notes'],
  },
  {
    slug: 'platform-widgets-chat',
    name: '876 Chat widget',
    description: 'Global switch for the shared 876 Chat rail widget.',
    parentSlug: 'platform-widgets',
    defaultEnabled: true,
    tags: ['widget'],
    legacySlugs: ['platform_widgets_chat'],
  },
] as const

export const FEATURE_SEEDS_BY_APP: Readonly<
  Record<string, readonly FeatureSeed[]>
> = {
  console: [
    {
      slug: 'console-widgets',
      name: 'Widgets',
      description: 'Master switch for the Console widget rail.',
      tags: ['widget'],
      legacySlugs: ['console_widgets'],
    },
    {
      slug: 'console-widgets-notepad',
      name: 'Notepad widget',
      description: 'Controls access to the Console Notepad widget.',
      parentSlug: 'console-widgets',
      tags: ['widget'],
      legacySlugs: ['console_widgets_notepad', 'console_widgets_notes'],
    },
    {
      slug: 'console-widgets-live-logs',
      name: 'Live logs widget',
      description: 'Controls access to the Console Live logs widget.',
      parentSlug: 'console-widgets',
      tags: ['widget'],
      legacySlugs: ['console_widgets_live_logs'],
    },
    {
      slug: 'console-chat',
      name: '876 Chat',
      description: 'Master switch for the 876 Chat rail in Console.',
      defaultEnabled: true,
      legacySlugs: ['console_chat'],
    },
    {
      slug: 'console-widgets-chat',
      name: '876 Chat widget',
      description: 'Controls access to the 876 Chat widget in Console.',
      parentSlug: 'console-widgets',
      defaultEnabled: true,
      tags: ['widget'],
      legacySlugs: ['console_widgets_chat'],
      copyStateFromSlug: 'console-chat',
    },
    {
      slug: 'console-notifications',
      name: 'Notifications',
      description: 'Master switch for Console notification channels.',
      legacySlugs: ['console_notifications'],
    },
    {
      slug: 'console-notifications-email-alerts',
      name: 'Email alerts',
      description: 'Controls access to Console email notification channels.',
      parentSlug: 'console-notifications',
      legacySlugs: ['console_notifications_email_alerts'],
    },
    {
      slug: 'console-notifications-slack',
      name: 'Slack notifications',
      description: 'Controls access to Console Slack notification channels.',
      parentSlug: 'console-notifications',
      legacySlugs: ['console_notifications_slack'],
    },
    {
      slug: 'console-notifications-webhooks',
      name: 'Webhook notifications',
      description: 'Controls access to Console webhook notification channels.',
      parentSlug: 'console-notifications',
      legacySlugs: ['console_notifications_webhooks'],
    },
    {
      slug: 'console-theme-switcher',
      name: 'Theme switcher',
      description: 'Controls access to the Console theme switcher.',
      legacySlugs: ['console_theme_switcher'],
    },
    {
      slug: 'console-global-add',
      name: 'Global add',
      description: 'Controls access to the Console global add menu.',
      legacySlugs: ['console_global_add'],
    },
    {
      slug: 'console-app-switcher',
      name: 'App switcher',
      description: 'Controls access to the Console app switcher.',
      legacySlugs: ['console_app_switcher'],
    },
    {
      slug: 'console-search-bar',
      name: 'Search bar',
      description: 'Controls access to the Console search bar.',
      legacySlugs: ['console_search_bar'],
    },
  ],
  '876-couriers': [
    {
      slug: 'couriers-widgets',
      name: 'Widgets',
      description: 'Master switch for the Couriers widget rail.',
      tags: ['widget'],
      legacySlugs: ['couriers_widgets'],
    },
    {
      slug: 'couriers-widgets-notepad',
      name: 'Notepad widget',
      description: 'Controls access to the shared Notepad widget in Couriers.',
      parentSlug: 'couriers-widgets',
      tags: ['widget'],
      legacySlugs: ['couriers_widgets_notepad'],
    },
    {
      slug: 'couriers-chat',
      name: '876 Chat',
      description: 'Master switch for the 876 Chat rail in Couriers.',
      defaultEnabled: true,
      legacySlugs: ['couriers_chat'],
    },
    {
      slug: 'couriers-widgets-chat',
      name: '876 Chat widget',
      description: 'Controls access to the 876 Chat widget in Couriers.',
      parentSlug: 'couriers-widgets',
      defaultEnabled: true,
      tags: ['widget'],
      legacySlugs: ['couriers_widgets_chat'],
      copyStateFromSlug: 'couriers-chat',
    },
    {
      slug: 'couriers-theme-switcher',
      name: 'Theme switcher',
      description: 'Light/dark appearance toggle in the account menu.',
      legacySlugs: ['couriers_theme_switcher'],
    },
    {
      slug: 'couriers-global-add',
      name: 'Global add',
      description: 'Universal create button in the top nav.',
      legacySlugs: ['couriers_global_add'],
    },
    {
      slug: 'couriers-app-switcher',
      name: 'App switcher',
      description: '876 app launcher in the top nav.',
      legacySlugs: ['couriers_app_switcher'],
    },
    {
      slug: 'couriers-search-bar',
      name: 'Search bar',
      description: 'Global search bar in the Couriers top nav.',
      legacySlugs: ['couriers_search_bar'],
    },
    {
      slug: 'couriers-org-switcher',
      name: 'Org switcher',
      description: 'Organization switcher in the top nav.',
      legacySlugs: ['couriers_org_switcher'],
    },
    {
      slug: 'couriers-storage-org-logo-upload',
      name: 'Organization logo upload',
      description:
        'Allows organization owners and admins to upload organization logos.',
      legacySlugs: ['couriers_storage_org_logo_upload'],
    },
    {
      slug: 'couriers-operations',
      name: 'Operations',
      description: 'Master switch for Couriers operations areas.',
      legacySlugs: ['couriers_operations'],
    },
    {
      slug: 'couriers-operations-packages',
      name: 'Packages',
      description: 'Controls access to Couriers packages.',
      parentSlug: 'couriers-operations',
      legacySlugs: ['couriers_operations_packages'],
    },
    {
      slug: 'couriers-operations-customers',
      name: 'Customers',
      description: 'Controls access to Couriers customers.',
      parentSlug: 'couriers-operations',
      legacySlugs: ['couriers_operations_customers'],
    },
    {
      slug: 'couriers-operations-items',
      name: 'Items',
      description: 'Controls access to Couriers items.',
      parentSlug: 'couriers-operations',
      legacySlugs: ['couriers_operations_items'],
    },
  ],
  '876-crm': [
    {
      slug: 'crm-theme-switcher',
      name: 'Theme switcher',
      description: 'Light/dark appearance toggle in the account menu.',
      legacySlugs: ['crm_theme_switcher'],
    },
    {
      slug: 'crm-global-add',
      name: 'Global add',
      description: 'Universal create button in the top nav.',
      legacySlugs: ['crm_global_add'],
    },
    {
      slug: 'crm-app-switcher',
      name: 'App switcher',
      description: '876 app launcher in the top nav.',
      legacySlugs: ['crm_app_switcher'],
    },
    {
      slug: 'crm-search-bar',
      name: 'Search bar',
      description: 'Global search bar in the CRM top nav.',
      legacySlugs: ['crm_search_bar'],
    },
    {
      slug: 'crm-org-switcher',
      name: 'Org switcher',
      description: 'Organization switcher in the top nav.',
      legacySlugs: ['crm_org_switcher'],
    },
  ],
  '876-billing': [
    {
      slug: 'billing-widgets',
      name: 'Widgets',
      description: 'Master switch for the Billing widget rail.',
      tags: ['widget'],
      legacySlugs: ['billing_widgets'],
    },
    {
      slug: 'billing-widgets-notepad',
      name: 'Notepad widget',
      description: 'Controls access to the shared Notepad widget in Billing.',
      parentSlug: 'billing-widgets',
      tags: ['widget'],
      legacySlugs: ['billing_widgets_notepad', 'billing_widgets_notes'],
    },
    {
      slug: 'billing-chat',
      name: '876 Chat',
      description: 'Master switch for the 876 Chat rail in Billing.',
      defaultEnabled: true,
      legacySlugs: ['billing_chat'],
    },
    {
      slug: 'billing-widgets-chat',
      name: '876 Chat widget',
      description: 'Controls access to the 876 Chat widget in Billing.',
      parentSlug: 'billing-widgets',
      defaultEnabled: true,
      tags: ['widget'],
      legacySlugs: ['billing_widgets_chat'],
      copyStateFromSlug: 'billing-chat',
    },
    {
      slug: 'billing-sales',
      name: 'Sales',
      description: 'Master switch for Billing sales documents.',
      legacySlugs: ['billing_sales'],
    },
    {
      slug: 'billing-sales-quotes',
      name: 'Quotes',
      description: 'Controls access to Billing quotes.',
      parentSlug: 'billing-sales',
      legacySlugs: ['billing_sales_quotes'],
    },
    {
      slug: 'billing-sales-estimates',
      name: 'Estimates',
      description: 'Controls access to Billing estimates.',
      parentSlug: 'billing-sales',
      defaultEnabled: false,
      legacySlugs: ['billing_sales_estimates'],
    },
    {
      slug: 'billing-sales-invoices',
      name: 'Invoices',
      description: 'Controls access to Billing invoices.',
      parentSlug: 'billing-sales',
      legacySlugs: ['billing_sales_invoices'],
    },
    {
      slug: 'billing-subscriptions',
      name: 'Subscriptions',
      description: 'Controls access to Billing subscription management.',
      legacySlugs: ['billing_subscriptions'],
    },
    {
      slug: 'billing-purchases',
      name: 'Purchases',
      description: 'Master switch for Billing purchase management.',
      defaultEnabled: false,
      legacySlugs: ['billing_purchases'],
    },
    {
      slug: 'billing-purchases-vendors',
      name: 'Vendors',
      description: 'Controls access to Billing vendors.',
      parentSlug: 'billing-purchases',
      defaultEnabled: false,
      legacySlugs: ['billing_purchases_vendors'],
    },
    {
      slug: 'billing-purchases-expenses',
      name: 'Expenses',
      description: 'Controls access to Billing expenses.',
      parentSlug: 'billing-purchases',
      defaultEnabled: false,
      legacySlugs: ['billing_purchases_expenses'],
    },
    {
      slug: 'billing-banking',
      name: 'Banking',
      description: 'Controls access to Billing banking.',
      defaultEnabled: false,
      legacySlugs: ['billing_banking'],
    },
    {
      slug: 'billing-documents',
      name: 'Documents',
      description: 'Controls access to Billing documents.',
      defaultEnabled: false,
      legacySlugs: ['billing_documents'],
    },
    {
      slug: 'billing-payroll',
      name: 'Payroll',
      description: 'Controls access to Billing payroll.',
      defaultEnabled: false,
      legacySlugs: ['billing_payroll'],
    },
    {
      slug: 'billing-theme-switcher',
      name: 'Theme switcher',
      description: 'Controls access to the Billing theme switcher.',
      defaultEnabled: false,
      legacySlugs: ['billing_theme_switcher'],
    },
    {
      slug: 'billing-global-add',
      name: 'Global add',
      description: 'Controls access to the Billing global add menu.',
      legacySlugs: ['billing_global_add'],
    },
    {
      slug: 'billing-app-switcher',
      name: 'App switcher',
      description: 'Controls access to the Billing app switcher.',
      legacySlugs: ['billing_app_switcher'],
    },
    {
      slug: 'billing-search-bar',
      name: 'Search bar',
      description: 'Controls access to the Billing search bar.',
      legacySlugs: ['billing_search_bar'],
    },
    {
      slug: 'billing-org-switcher',
      name: 'Org switcher',
      description: 'Organization switcher in the top nav.',
      legacySlugs: ['billing_org_switcher'],
    },
  ],
}

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function featurePrefixForAppSlug(appSlug: string): string {
  const map: Record<string, string> = {
    '876-consumer': 'app',
    '876-enterprise': 'enterprise',
    console: 'console',
    '876-couriers': 'couriers',
    '876-billing': 'billing',
    '876-crm': 'crm',
  }
  return map[appSlug] ?? normalizeSlug(appSlug.replace(/^876-/, ''))
}

function featureSlugMatchesApp(featureSlug: string, appSlug: string): boolean {
  const prefix = featurePrefixForAppSlug(appSlug)
  return Boolean(prefix) && featureSlug.startsWith(`${prefix}-`)
}

export function validateFeatureSeeds(
  appSlug: string | null,
  featureSeeds: readonly FeatureSeed[]
): void {
  const seen = new Set<string>()
  const legacySeen = new Set<string>()

  for (const seed of featureSeeds) {
    const slug = seed.slug
    if (!FEATURE_SLUG.test(slug))
      throw new Error(`Feature slug ${JSON.stringify(slug)} must be kebab-case.`)
    if (seen.has(slug))
      throw new Error(`Duplicate feature slug ${JSON.stringify(slug)}.`)
    if (appSlug && !featureSlugMatchesApp(slug, appSlug)) {
      throw new Error(
        `Feature slug ${JSON.stringify(slug)} is not scoped to app ${JSON.stringify(appSlug)}.`
      )
    }
    if (appSlug === null && !slug.startsWith('platform-')) {
      throw new Error(
        `Platform feature slug ${JSON.stringify(slug)} must start with 'platform-'.`
      )
    }

    const parentSlug = seed.parentSlug
    if (parentSlug !== undefined) {
      if (!seen.has(parentSlug)) {
        throw new Error(
          `Feature parent ${JSON.stringify(parentSlug)} must be seeded before ${JSON.stringify(slug)}.`
        )
      }
      if (!slug.startsWith(`${parentSlug}-`)) {
        throw new Error(
          `Feature child ${JSON.stringify(slug)} must extend parent key ${JSON.stringify(parentSlug)}.`
        )
      }
    }

    if (seed.copyStateFromSlug && !seen.has(seed.copyStateFromSlug)) {
      throw new Error(
        `Feature state source ${JSON.stringify(seed.copyStateFromSlug)} must be seeded before ${JSON.stringify(slug)}.`
      )
    }

    for (const legacySlug of seed.legacySlugs ?? []) {
      if (legacySlug === slug)
        throw new Error(`Feature ${JSON.stringify(slug)} repeats itself as a legacy slug.`)
      if (legacySeen.has(legacySlug))
        throw new Error(`Duplicate legacy feature slug ${JSON.stringify(legacySlug)}.`)
      legacySeen.add(legacySlug)
    }

    seen.add(slug)
  }
}

export type FeatureSeedSummary = {
  scope: string
  created: number
  updated: number
  skipped: boolean
  reason?: string
}

function providerCandidate(
  providerFeatures: Record<string, Record<string, unknown>>,
  seed: FeatureSeed
): { slug: string; feature: Record<string, unknown> } | null {
  const matches = [seed.slug, ...(seed.legacySlugs ?? [])]
    .map((slug) => ({ slug, feature: providerFeatures[slug] }))
    .filter(
      (entry): entry is { slug: string; feature: Record<string, unknown> } =>
        entry.feature !== undefined
    )

  if (matches.length > 1) {
    throw new Error(
      `Feature migration collision for ${JSON.stringify(seed.slug)} in PostHog: ${matches
        .map((entry) => JSON.stringify(entry.slug))
        .join(', ')}.`
    )
  }
  return matches[0] ?? null
}

async function localCandidate(
  seed: FeatureSeed
): Promise<{ slug: string; feature: Awaited<ReturnType<typeof findFeatureBySlug>> } | null> {
  const matches: Array<{
    slug: string
    feature: NonNullable<Awaited<ReturnType<typeof findFeatureBySlug>>>
  }> = []

  for (const slug of [seed.slug, ...(seed.legacySlugs ?? [])]) {
    const feature = await findFeatureBySlug(slug)
    if (feature) matches.push({ slug, feature })
  }

  if (matches.length > 1) {
    throw new Error(
      `Feature migration collision for ${JSON.stringify(seed.slug)} in the local catalog: ${matches
        .map((entry) => JSON.stringify(entry.slug))
        .join(', ')}.`
    )
  }
  return matches[0] ?? null
}

async function seedPosthogFeatures(params: {
  appSlug: string | null
  featureSeeds: readonly FeatureSeed[]
  posthog?: PostHogClient | null
  providerFeatures?: Record<string, Record<string, unknown>> | null
}): Promise<FeatureSeedSummary> {
  const scopeLabel = params.appSlug ?? 'platform'
  const settings = getSettings()

  if (
    !settings.posthog.personalApiKey ||
    !settings.posthog.projectId ||
    !settings.posthog.host
  ) {
    log.info(
      { app_slug: scopeLabel },
      'features.seed.skipped_posthog_not_configured'
    )
    return {
      scope: scopeLabel,
      created: 0,
      updated: 0,
      skipped: true,
      reason: 'posthog_not_configured',
    }
  }

  const app = params.appSlug ? await findAppBySlug(params.appSlug) : null
  if (params.appSlug && !app) {
    log.info({ app_slug: params.appSlug }, 'features.seed.skipped_app_missing')
    return {
      scope: scopeLabel,
      created: 0,
      updated: 0,
      skipped: true,
      reason: 'app_missing',
    }
  }

  const legacyFeature = await findAnyLegacyFeature()
  const completedArchive = await findCompletedArchive()
  if (legacyFeature !== null && completedArchive === null) {
    log.error(
      { app_slug: scopeLabel },
      'features.seed.skipped_provider_snapshot_required'
    )
    return {
      scope: scopeLabel,
      created: 0,
      updated: 0,
      skipped: true,
      reason: 'provider_snapshot_required',
    }
  }

  const activePosthog = params.posthog ?? getPostHogClient(settings)
  let providerFeatures = params.providerFeatures ?? null
  if (providerFeatures === null) {
    const rows = await activePosthog.listFeatures()
    providerFeatures = {}
    for (const row of rows) {
      const key = String(row['key'] ?? '')
      if (key) providerFeatures[key] = row
    }
  }

  const featureIdsBySlug = new Map<string, string>()
  let created = 0
  let updated = 0

  for (const seed of params.featureSeeds) {
    const providerMatch = providerCandidate(providerFeatures, seed)
    let providerFeature = providerMatch?.feature ?? null

    if (providerMatch && providerMatch.slug !== seed.slug) {
      providerFeature = await activePosthog.updateFeature(
        String(providerMatch.feature['id']),
        {
          key: seed.slug,
          description: seed.description,
        }
      )
      delete providerFeatures[providerMatch.slug]
      providerFeatures[seed.slug] = providerFeature
      log.info(
        {
          app_slug: scopeLabel,
          legacy_slug: providerMatch.slug,
          slug: seed.slug,
          provider_feature_id: String(providerFeature['id']),
        },
        'features.seed.provider_key_migrated'
      )
    }

    if (!providerFeature) {
      const copiedProviderFeature = seed.copyStateFromSlug
        ? (providerFeatures[seed.copyStateFromSlug] ?? null)
        : null
      providerFeature = await activePosthog.createFeature({
        key: seed.slug,
        name: seed.name,
        description: seed.description,
        enabled: copiedProviderFeature
          ? Boolean(copiedProviderFeature['active'] ?? false)
          : (seed.defaultEnabled ?? true),
      })
      providerFeatures[seed.slug] = providerFeature
    }

    const parentSlug = seed.parentSlug
    const parentFeatureId = parentSlug
      ? (featureIdsBySlug.get(parentSlug) ?? null)
      : null
    const providerFeatureId = String(providerFeature['id'])
    const localMatch = await localCandidate(seed)
    let existing = localMatch?.feature ?? null

    if (localMatch && localMatch.slug !== seed.slug) {
      await updateFeature(localMatch.feature.id, { slug: seed.slug })
      existing = await findFeatureById(localMatch.feature.id)
      log.info(
        {
          app_slug: scopeLabel,
          feature_id: localMatch.feature.id,
          legacy_slug: localMatch.slug,
          slug: seed.slug,
        },
        'features.seed.local_key_migrated'
      )
    }

    const now = BigInt(nowUnixSeconds())
    const isWidget = (seed.tags ?? []).includes('widget')

    if (!existing) {
      const feature = await createFeature({
        id: generateId('feature'),
        provider: 'posthog',
        providerFeatureId,
        providerEnvironmentId: String(settings.posthog.projectId),
        slug: seed.slug,
        name: seed.name,
        description: seed.description,
        enabled: Boolean(providerFeature['active'] ?? false),
        scope: 'global',
        consumerDefaultEnabled: false,
        defaultValue: isWidget
          ? Boolean(providerFeature['active'] ?? false)
          : false,
        appId: app ? app.id : null,
        parentFeatureId,
        tags: [
          ...new Set([
            ...(seed.tags ?? []),
            ...((providerFeature['tags'] as string[] | undefined) ?? []).map(
              String
            ),
          ]),
        ].sort(),
        serverSideOnly: true,
        providerMetadata: providerFeature,
        syncedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      featureIdsBySlug.set(seed.slug, feature.id)
      if (seed.copyStateFromSlug) {
        const source = await findFeatureBySlug(seed.copyStateFromSlug)
        if (source) await copyFeatureGrants(source.id, feature.id, now)
      }
      created += 1
      log.info(
        {
          app_slug: scopeLabel,
          feature_id: feature.id,
          slug: feature.slug,
          provider: 'posthog',
          provider_feature_id: providerFeatureId,
        },
        'features.seed.created'
      )
    } else {
      const existingTags: string[] = (existing.tags as string[]) ?? []
      const mergedTags = [
        ...new Set([...existingTags, ...(seed.tags ?? [])]),
      ].sort()

      const updatePayload: Parameters<typeof updateFeature>[1] = {
        provider: 'posthog',
        providerFeatureId,
        providerEnvironmentId: String(settings.posthog.projectId),
        appId: app ? app.id : null,
        parentFeatureId,
        name: seed.name,
        description: seed.description,
        enabled: Boolean(providerFeature['active'] ?? false),
        tags: mergedTags,
        providerMetadata: providerFeature,
        syncedAt: now,
        updatedAt: now,
      }
      if (isWidget) {
        updatePayload.defaultValue = Boolean(providerFeature['active'] ?? false)
      }

      const feature = await updateFeature(existing.id, updatePayload)
      featureIdsBySlug.set(seed.slug, feature.id)
      if (seed.copyStateFromSlug) {
        const source = await findFeatureBySlug(seed.copyStateFromSlug)
        if (source) await copyFeatureGrants(source.id, feature.id, now)
      }
      updated += 1
      log.info(
        {
          app_slug: scopeLabel,
          feature_id: feature.id,
          slug: feature.slug,
          provider: 'posthog',
          provider_feature_id: providerFeatureId,
        },
        'features.seed.synced'
      )
    }
  }

  return { scope: scopeLabel, created, updated, skipped: false }
}

export async function seedConsoleFeatures(): Promise<FeatureSeedSummary> {
  validateFeatureSeeds('console', FEATURE_SEEDS_BY_APP['console'] ?? [])
  return seedPosthogFeatures({
    appSlug: 'console',
    featureSeeds: FEATURE_SEEDS_BY_APP['console'] ?? [],
  })
}

export async function seedBillingFeatures(): Promise<FeatureSeedSummary> {
  validateFeatureSeeds('876-billing', FEATURE_SEEDS_BY_APP['876-billing'] ?? [])
  return seedPosthogFeatures({
    appSlug: '876-billing',
    featureSeeds: FEATURE_SEEDS_BY_APP['876-billing'] ?? [],
  })
}

export async function seedCouriersFeatures(): Promise<FeatureSeedSummary> {
  validateFeatureSeeds(
    '876-couriers',
    FEATURE_SEEDS_BY_APP['876-couriers'] ?? []
  )
  return seedPosthogFeatures({
    appSlug: '876-couriers',
    featureSeeds: FEATURE_SEEDS_BY_APP['876-couriers'] ?? [],
  })
}

export async function seedCrmFeatures(): Promise<FeatureSeedSummary> {
  validateFeatureSeeds('876-crm', FEATURE_SEEDS_BY_APP['876-crm'] ?? [])
  return seedPosthogFeatures({
    appSlug: '876-crm',
    featureSeeds: FEATURE_SEEDS_BY_APP['876-crm'] ?? [],
  })
}

export async function seedPlatformWidgetFeatures(): Promise<FeatureSeedSummary> {
  validateFeatureSeeds(null, PLATFORM_FEATURE_SEEDS)
  return seedPosthogFeatures({
    appSlug: null,
    featureSeeds: PLATFORM_FEATURE_SEEDS,
  })
}

export async function seedAllFeatures(): Promise<FeatureSeedSummary> {
  const settings = getSettings()
  if (
    !settings.posthog.personalApiKey ||
    !settings.posthog.projectId ||
    !settings.posthog.host
  ) {
    log.info(
      { app_slug: 'all' },
      'features.seed.skipped_posthog_not_configured'
    )
    return {
      scope: 'all',
      created: 0,
      updated: 0,
      skipped: true,
      reason: 'posthog_not_configured',
    }
  }

  const posthog = getPostHogClient(settings)
  const rows = await posthog.listFeatures()
  const providerFeatures: Record<string, Record<string, unknown>> = {}
  for (const row of rows) {
    const key = String(row['key'] ?? '')
    if (key) providerFeatures[key] = row
  }

  let totalCreated = 0
  let totalUpdated = 0

  for (const appSlug of [
    'console',
    '876-billing',
    '876-couriers',
    '876-crm',
  ] as const) {
    const result = await seedPosthogFeatures({
      appSlug,
      featureSeeds: FEATURE_SEEDS_BY_APP[appSlug] ?? [],
      posthog,
      providerFeatures,
    })
    totalCreated += result.created
    totalUpdated += result.updated
  }

  const platformResult = await seedPosthogFeatures({
    appSlug: null,
    featureSeeds: PLATFORM_FEATURE_SEEDS,
    posthog,
    providerFeatures,
  })
  totalCreated += platformResult.created
  totalUpdated += platformResult.updated

  return {
    scope: 'all',
    created: totalCreated,
    updated: totalUpdated,
    skipped: false,
  }
}
