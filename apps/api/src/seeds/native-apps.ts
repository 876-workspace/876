import { generateId } from '@/platform/ids'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  createNativeApp,
  findNativeAppBySlug,
  syncNativeApp,
} from './native-apps.repository'

const log = getLogger('seeds:native-apps')

export const PROJECTS_MOBILE_SLUG = '876-projects-mobile'
export const PROJECTS_MOBILE_CLIENT_ID = '876_projects_mobile'
export const PROJECTS_MOBILE_REDIRECT_URI =
  'com.efesto.projects://oauth/callback'
export const PROJECTS_MOBILE_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
]

export type NativeAppsSeedSummary = {
  created: boolean
  synced: boolean
}

/**
 * Registers the 876 Projects mobile app as a first-party public OAuth client.
 *
 * The client id is fixed (public identifier, baked into the native bundle and
 * the Enterprise authorize proxy) while web-app client ids are random per
 * environment. The row stays secret-free: a stored secret would turn the
 * mobile app into a confidential client it cannot be. The seed is idempotent
 * and repairs drift on redirect URIs, scopes, kind, and type, so an operator
 * edit that breaks native sign-in converges back on the next seed run.
 */
export async function seedNativeApps(options: {
  organizationId: string
}): Promise<NativeAppsSeedSummary> {
  const now = BigInt(nowUnixSeconds())
  const existing = await findNativeAppBySlug(PROJECTS_MOBILE_SLUG)
  if (!existing) {
    await createNativeApp({
      id: generateId('registeredApp'),
      name: '876 Projects Mobile',
      slug: PROJECTS_MOBILE_SLUG,
      organizationId: options.organizationId,
      clientId: PROJECTS_MOBILE_CLIENT_ID,
      appKind: 'product',
      type: 'native',
      allowedRedirectUris: [PROJECTS_MOBILE_REDIRECT_URI],
      scopesAllowed: PROJECTS_MOBILE_SCOPES,
      createdAt: now,
      updatedAt: now,
    })
    log.info({ slug: PROJECTS_MOBILE_SLUG }, 'native-apps.app_created')
    return { created: true, synced: false }
  }

  const drifted =
    existing.clientId !== PROJECTS_MOBILE_CLIENT_ID ||
    existing.clientType !== 'public' ||
    existing.clientSecretHash !== null ||
    existing.appKind !== 'product' ||
    existing.status !== 'active' ||
    existing.type !== 'native' ||
    existing.allowedRedirectUris.length !== 1 ||
    existing.allowedRedirectUris[0] !== PROJECTS_MOBILE_REDIRECT_URI ||
    existing.scopesAllowed.length !== PROJECTS_MOBILE_SCOPES.length ||
    !PROJECTS_MOBILE_SCOPES.every((scope) =>
      existing.scopesAllowed.includes(scope)
    )

  if (drifted) {
    await syncNativeApp(existing.id, {
      appKind: 'product',
      type: 'native',
      allowedRedirectUris: [PROJECTS_MOBILE_REDIRECT_URI],
      scopesAllowed: PROJECTS_MOBILE_SCOPES,
      updatedAt: now,
    })
    log.info({ slug: PROJECTS_MOBILE_SLUG }, 'native-apps.app_synced')
    return { created: false, synced: true }
  }

  return { created: false, synced: false }
}
