import { getSettings } from '@/config'
import { getLogger } from '@/platform/logger'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'
import { getPostHogClient, PostHogClient } from '@/providers/posthog/client'

import {
  createFeature,
  findAppBySlug,
  findAnyLegacyFeature,
  findCompletedArchive,
  findFeatureById,
  findFeatureBySlug,
  updateFeature,
} from './features.repository'

const log = getLogger('seeds:features')

export type FeatureSeed = {
  slug: string
  name: string
  description: string
  parentSlug?: string
  defaultEnabled?: boolean
  tags?: string[]
  legacySlugs?: string[]
}

export const PLATFORM_FEATURE_SEEDS: readonly FeatureSeed[] = [
  {
    slug: 'platform_widgets',
    name: 'Shared widgets',
    description: 'Global master switch for widgets shared across 876 apps.',
    tags: ['widget'],
  },
  {
    slug: 'platform_widgets_notepad',
    name: 'Shared Notepad widget',
    description: 'Global switch for the account-owned Notepad widget.',
    parentSlug: 'platform_widgets',
    tags: ['widget'],
    legacySlugs: ['platform_widgets_notes'],
  },
] as const

export const FEATURE_SEEDS_BY_APP: Readonly<
  Record<string, readonly FeatureSeed[]>
> = {
  console: [
    {
      slug: 'console_widgets',
      name: 'Widgets',
      description: 'Master switch for the Console widget rail.',
      tags: ['widget'],
    },
    {
      slug: 'console_widgets_notepad',
      name: 'Notepad widget',
      description: 'Controls access to the Console Notepad widget.',
      parentSlug: 'console_widgets',
      tags: ['widget'],
      legacySlugs: ['console_widgets_notes'],
    },
    {
      slug: 'console_widgets_live_logs',
      name: 'Live logs widget',
      description: 'Controls access to the Console Live logs widget.',
      parentSlug: 'console_widgets',
      tags: ['widget'],
    },
    {
      slug: 'console_notifications',
      name: 'Notifications',
      description: 'Master switch for Console notification channels.',
    },
    {
      slug: 'console_notifications_email_alerts',
      name: 'Email alerts',
      description: 'Controls access to Console email notification channels.',
      parentSlug: 'console_notifications',
    },
    {
      slug: 'console_notifications_slack',
      name: 'Slack notifications',
      description: 'Controls access to Console Slack notification channels.',
      parentSlug: 'console_notifications',
    },
    {
      slug: 'console_notifications_webhooks',
      name: 'Webhook notifications',
      description: 'Controls access to Console webhook notification channels.',
      parentSlug: 'console_notifications',
    },
    {
      slug: 'console_theme_switcher',
      name: 'Theme switcher',
      description: 'Controls access to the Console theme switcher.',
    },
    {
      slug: 'console_global_add',
      name: 'Global add',
      description: 'Controls access to the Console global add menu.',
    },
    {
      slug: 'console_app_switcher',
      name: 'App switcher',
      description: 'Controls access to the Console app switcher.',
    },
    {
      slug: 'console_search_bar',
      name: 'Search bar',
      description: 'Controls access to the Console search bar.',
    },
    {
      slug: 'console_chat',
      name: '876 Chat',
      description: 'Master switch for the 876 Chat rail in Console.',
      defaultEnabled: true,
    },
  ],
  '876-couriers': [
    {
      slug: 'couriers_widgets',
      name: 'Widgets',
      description: 'Master switch for the Couriers widget rail.',
      tags: ['widget'],
    },
    {
      slug: 'couriers_widgets_notepad',
      name: 'Notepad widget',
      description: 'Controls access to the shared Notepad widget in Couriers.',
      parentSlug: 'couriers_widgets',
      tags: ['widget'],
    },
    {
      slug: 'couriers_chat',
      name: '876 Chat',
      description: 'Master switch for the 876 Chat rail in Couriers.',
      defaultEnabled: true,
    },
    {
      slug: 'couriers_theme_switcher',
      name: 'Theme switcher',
      description: 'Light/dark appearance toggle in the account menu.',
    },
    {
      slug: 'couriers_global_add',
      name: 'Global add',
      description: 'Universal create button in the top nav.',
    },
    {
      slug: 'couriers_app_switcher',
      name: 'App switcher',
      description: '876 app launcher in the top nav.',
    },
    {
      slug: 'couriers_search_bar',
      name: 'Search bar',
      description: 'Global search bar in the Couriers top nav.',
    },
    {
      slug: 'couriers_org_switcher',
      name: 'Org switcher',
      description: 'Organization switcher in the top nav.',
    },
    {
      slug: 'couriers_storage_org_logo_upload',
      name: 'Organization logo upload',
      description:
        'Allows organization owners and admins to upload organization logos.',
    },
    {
      slug: 'couriers_operations',
      name: 'Operations',
      description: 'Master switch for Couriers operations areas.',
    },
    {
      slug: 'couriers_operations_packages',
      name: 'Packages',
      description: 'Controls access to Couriers packages.',
      parentSlug: 'couriers_operations',
    },
    {
      slug: 'couriers_operations_customers',
      name: 'Customers',
      description: 'Controls access to Couriers customers.',
      parentSlug: 'couriers_operations',
    },
    {
      slug: 'couriers_operations_items',
      name: 'Items',
      description: 'Controls access to Couriers items.',
      parentSlug: 'couriers_operations',
    },
  ],
  '876-billing': [
    {
      slug: 'billing_widgets',
      name: 'Widgets',
      description: 'Master switch for the Billing widget rail.',
      tags: ['widget'],
    },
    {
      slug: 'billing_widgets_notepad',
      name: 'Notepad widget',
      description: 'Controls access to the shared Notepad widget in Billing.',
      parentSlug: 'billing_widgets',
      tags: ['widget'],
      legacySlugs: ['billing_widgets_notes'],
    },
    {
      slug: 'billing_chat',
      name: '876 Chat',
      description: 'Master switch for the 876 Chat rail in Billing.',
      defaultEnabled: true,
    },
    {
      slug: 'billing_sales',
      name: 'Sales',
      description: 'Master switch for Billing sales documents.',
    },
    {
      slug: 'billing_sales_quotes',
      name: 'Quotes',
      description: 'Controls access to Billing quotes.',
      parentSlug: 'billing_sales',
    },
    {
      slug: 'billing_sales_invoices',
      name: 'Invoices',
      description: 'Controls access to Billing invoices.',
      parentSlug: 'billing_sales',
    },
    {
      slug: 'billing_subscriptions',
      name: 'Subscriptions',
      description: 'Controls access to Billing subscription management.',
    },
    {
      slug: 'billing_purchases',
      name: 'Purchases',
      description: 'Master switch for Billing purchase management.',
      defaultEnabled: false,
    },
    {
      slug: 'billing_purchases_vendors',
      name: 'Vendors',
      description: 'Controls access to Billing vendors.',
      parentSlug: 'billing_purchases',
      defaultEnabled: false,
    },
    {
      slug: 'billing_purchases_expenses',
      name: 'Expenses',
      description: 'Controls access to Billing expenses.',
      parentSlug: 'billing_purchases',
      defaultEnabled: false,
    },
    {
      slug: 'billing_banking',
      name: 'Banking',
      description: 'Controls access to Billing banking.',
      defaultEnabled: false,
    },
    {
      slug: 'billing_documents',
      name: 'Documents',
      description: 'Controls access to Billing documents.',
      defaultEnabled: false,
    },
    {
      slug: 'billing_payroll',
      name: 'Payroll',
      description: 'Controls access to Billing payroll.',
      defaultEnabled: false,
    },
    {
      slug: 'billing_theme_switcher',
      name: 'Theme switcher',
      description: 'Controls access to the Billing theme switcher.',
      defaultEnabled: false,
    },
    {
      slug: 'billing_global_add',
      name: 'Global add',
      description: 'Controls access to the Billing global add menu.',
    },
    {
      slug: 'billing_app_switcher',
      name: 'App switcher',
      description: 'Controls access to the Billing app switcher.',
    },
    {
      slug: 'billing_search_bar',
      name: 'Search bar',
      description: 'Controls access to the Billing search bar.',
    },
    {
      slug: 'billing_org_switcher',
      name: 'Org switcher',
      description: 'Organization switcher in the top nav.',
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
  }
  if (map[appSlug]) return map[appSlug]!
  return normalizeSlug(appSlug.replace(/^876-/, '')).replace(/-/g, '_')
}

function featureSlugMatchesApp(featureSlug: string, appSlug: string): boolean {
  const prefix = featurePrefixForAppSlug(appSlug)
  return Boolean(prefix) && featureSlug.startsWith(`${prefix}_`)
}

export function validateFeatureSeeds(
  appSlug: string | null,
  featureSeeds: readonly FeatureSeed[]
): void {
  const seen = new Set<string>()
  for (const seed of featureSeeds) {
    const slug = seed.slug
    if (appSlug && !featureSlugMatchesApp(slug, appSlug)) {
      throw new Error(
        `Feature slug ${JSON.stringify(slug)} is not scoped to app ${JSON.stringify(appSlug)}.`
      )
    }
    if (appSlug === null && !slug.startsWith('platform_')) {
      throw new Error(
        `Platform feature slug ${JSON.stringify(slug)} must start with 'platform_'.`
      )
    }
    const parentSlug = seed.parentSlug
    if (parentSlug !== undefined) {
      if (!seen.has(parentSlug)) {
        throw new Error(
          `Feature parent ${JSON.stringify(parentSlug)} must be seeded before ${JSON.stringify(slug)}.`
        )
      }
      if (!slug.startsWith(`${parentSlug}_`)) {
        throw new Error(
          `Feature child ${JSON.stringify(slug)} must extend parent key ${JSON.stringify(parentSlug)}.`
        )
      }
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
    let providerFeature = providerFeatures[seed.slug] ?? null
    if (!providerFeature) {
      for (const legacySlug of seed.legacySlugs ?? []) {
        const legacyProviderFeature = providerFeatures[legacySlug]
        if (!legacyProviderFeature) continue
        providerFeature = await activePosthog.updateFeature(
          String(legacyProviderFeature['id']),
          {
            key: seed.slug,
            description: seed.description,
          }
        )
        delete providerFeatures[legacySlug]
        providerFeatures[seed.slug] = providerFeature
        log.info(
          {
            app_slug: scopeLabel,
            legacy_slug: legacySlug,
            slug: seed.slug,
            provider_feature_id: String(providerFeature['id']),
          },
          'features.seed.provider_key_migrated'
        )
        break
      }
    }
    if (!providerFeature) {
      providerFeature = await activePosthog.createFeature({
        key: seed.slug,
        name: seed.name,
        description: seed.description,
        enabled: seed.defaultEnabled ?? true,
      })
      providerFeatures[seed.slug] = providerFeature
    }

    const parentSlug = seed.parentSlug
    const parentFeatureId = parentSlug
      ? (featureIdsBySlug.get(parentSlug) ?? null)
      : null
    const providerFeatureId = String(providerFeature['id'])
    let existing = await findFeatureBySlug(seed.slug)
    if (!existing) {
      for (const legacySlug of seed.legacySlugs ?? []) {
        const legacyLocal = await findFeatureBySlug(legacySlug)
        if (!legacyLocal) continue
        // Migrate slug in local catalog
        await updateFeature(legacyLocal.id, { slug: seed.slug })
        existing = await findFeatureById(legacyLocal.id)
        log.info(
          {
            app_slug: scopeLabel,
            feature_id: legacyLocal.id,
            legacy_slug: legacySlug,
            slug: seed.slug,
          },
          'features.seed.local_key_migrated'
        )
        break
      }
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
        defaultValue: isWidget ? (seed.defaultEnabled ?? true) : false,
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
        updatePayload.defaultValue = seed.defaultEnabled ?? true
      }

      const feature = await updateFeature(existing.id, updatePayload)
      featureIdsBySlug.set(seed.slug, feature.id)
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

  for (const appSlug of ['console', '876-billing', '876-couriers'] as const) {
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
