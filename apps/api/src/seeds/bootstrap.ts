import { randomUUID } from 'node:crypto'

import { nowUnixSeconds } from '@/platform/timestamps'
import { getLogger } from '@/platform/logger'
import { generateId } from '@/platform/ids'

import {
  createApp,
  createOrganization,
  findAppBySlug,
  findOrganizationBySlug,
  updateAppKind,
} from './bootstrap.repository'

const log = getLogger('seeds:bootstrap')

export type PlatformAppDefinition = {
  name: string
  slug: string
  appKind: string
  homepageUrl: string | null
}

/**
 * Mirrors core/platform_apps.py PLATFORM_APPS — the slugs are a contract.
 * The seed is idempotent: only creates absent rows, and only syncs appKind
 * when it drifts (idempotent taxonomy sync).
 */
export const PLATFORM_APPS: readonly PlatformAppDefinition[] = [
  {
    name: '876',
    slug: '876-consumer',
    appKind: 'platform',
    homepageUrl: 'https://876.app',
  },
  {
    name: '876 Enterprise',
    slug: '876-enterprise',
    appKind: 'platform',
    homepageUrl: 'https://enterprise.876.app',
  },
  {
    name: 'Console',
    slug: 'console',
    appKind: 'internal',
    homepageUrl: null,
  },
  {
    name: '876 Couriers',
    slug: '876-couriers',
    appKind: 'product',
    homepageUrl: 'https://couriers.876.app',
  },
  {
    name: '876 Billing',
    slug: '876-billing',
    appKind: 'product',
    homepageUrl: 'https://billing.876.app',
  },
] as const

export const EFESTO_ORG_SLUG = 'efesto'

export type BootstrapSeedSummary = {
  organizationCreated: boolean
  organizationId: string | null
  appsCreated: number
  appsUpdated: number
}

function generateClientId(): string {
  // Mirrors utils/security_helpers.generate_client_id — a UUID-derived identifier.
  return `876_${randomUUID().replaceAll('-', '')}`
}

export async function seedBootstrap(): Promise<BootstrapSeedSummary> {
  const now = BigInt(nowUnixSeconds())
  let organizationCreated = false

  const org = await findOrganizationBySlug(EFESTO_ORG_SLUG)
  let orgId: string | null = org?.id ?? null

  if (!org) {
    const created = await createOrganization({
      id: generateId('organization'),
      name: 'Efesto Technologies, Inc',
      shortName: 'Efesto',
      slug: EFESTO_ORG_SLUG,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    orgId = created.id
    organizationCreated = true
    log.info({ organization_id: orgId }, 'bootstrap.organization_created')
  }

  if (!orgId) {
    // Should not happen — findOrganizationBySlug returned null but create failed.
    // Return early with no apps seeded.
    return {
      organizationCreated,
      organizationId: null,
      appsCreated: 0,
      appsUpdated: 0,
    }
  }

  let appsCreated = 0
  let appsUpdated = 0

  for (const definition of PLATFORM_APPS) {
    const existing = await findAppBySlug(definition.slug)
    if (!existing) {
      await createApp({
        id: generateId('registeredApp'),
        name: definition.name,
        slug: definition.slug,
        organizationId: orgId,
        clientId: generateClientId(),
        appKind: definition.appKind,
        homepageUrl: definition.homepageUrl,
        createdAt: now,
        updatedAt: now,
      })
      appsCreated += 1
      log.info({ slug: definition.slug }, 'bootstrap.app_created')
    } else if (existing.appKind !== definition.appKind) {
      await updateAppKind(existing.id, definition.appKind, now)
      appsUpdated += 1
      log.info(
        { slug: definition.slug, app_kind: definition.appKind },
        'bootstrap.app_kind_synced'
      )
    }
  }

  return {
    organizationCreated,
    organizationId: orgId,
    appsCreated,
    appsUpdated,
  }
}
