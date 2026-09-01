import { generateId } from '@/platform/ids'
import { getLogger } from '@/platform/logger'
import {
  DEFAULT_ORG_ROLES,
  defaultPermissionsForRoleName,
} from '@/platform/permissions'
import { dispatchBillingCustomerSyncOnce } from '@/workers/billing-customer-dispatch'

import * as repository from './provisioning.repository'
import type { OrgRoleRow } from './provisioning.repository'
import { enqueueCustomerEnsureForOrganization } from './billing-customer-sync'
import { createBillingCustomerSyncRepository } from './billing-customer-sync.repository'
import {
  enabledProvisioningApplicationSlugs,
  requirePersistedProvisioningPolicy,
  resolveFreshProvisioningPolicy,
  retrievePersistedProvisioningPolicy,
} from './provisioning-policy'

/**
 * Organization provisioning: default roles, database-owned setup entitlements,
 * member assignments, and shared financial infrastructure.
 *
 * Fresh organizations are routed exactly once before their first entitlement
 * write. Existing organizations without a persisted setup are deliberately left
 * on the legacy Enterprise-only behavior until the explicit Phase 2 backfill
 * assigns them a setup.
 */

const log = getLogger('provisioning')

/** Every organization retains the Enterprise directory access plane. */
export const ENTERPRISE_APP_SLUG = '876-enterprise'

/** Standalone Billing product access remains independent of shared finance. */
export const BILLING_APP_SLUG = '876-billing'

/** Legacy-safe entitlement set for organizations not yet explicitly backfilled. */
export const DEFAULT_ORG_APP_SLUGS = [ENTERPRISE_APP_SLUG] as const

/** Apps that currently consume the shared Work service. */
export const WORK_DEPENDENT_APP_SLUGS = ['876-crm'] as const

export type EnqueueCustomerEnsure = (
  organizationId: string,
  now: number
) => Promise<void>

const defaultEnqueueCustomerEnsure: EnqueueCustomerEnsure = async (
  organizationId,
  now
) => {
  try {
    const organization =
      await repository.findOrganizationForCustomerEnsure(organizationId)
    if (!organization) return
    await enqueueCustomerEnsureForOrganization(
      { repository: createBillingCustomerSyncRepository() },
      organization,
      now
    )
    await dispatchBillingCustomerSyncOnce({ limit: 1 })
  } catch (error) {
    log.error(
      { err: error, org_id: organizationId },
      'provisioning.customer_ensure_failed'
    )
  }
}

export async function seedDefaultRoles(
  organizationId: string,
  now: number
): Promise<Record<string, OrgRoleRow>> {
  const existing = new Map(
    (await repository.listRolesForOrg(organizationId)).map((role) => [
      role.name,
      role,
    ])
  )

  const seeded: Record<string, OrgRoleRow> = {}
  for (const definition of DEFAULT_ORG_ROLES) {
    const current = existing.get(definition.name)
    if (current) {
      seeded[definition.name] = current
      continue
    }

    seeded[definition.name] = await repository.createRole({
      id: generateId('role'),
      organizationId,
      name: definition.name,
      displayName: definition.displayName,
      description: definition.description ?? null,
      permissions: [...definition.permissions],
      isSystem: true,
      createdAt: BigInt(now),
      updatedAt: BigInt(now),
    })
  }

  return seeded
}

async function provisionedApplicationSlugs(
  organizationId: string,
  creationTimestamp?: number
): Promise<string[]> {
  let persisted = await retrievePersistedProvisioningPolicy(organizationId)

  if (!persisted && creationTimestamp !== undefined) {
    const fresh = await resolveFreshProvisioningPolicy(
      organizationId,
      creationTimestamp
    )
    if (fresh) persisted = fresh
  }

  return persisted
    ? enabledProvisioningApplicationSlugs(persisted.policy)
    : [...DEFAULT_ORG_APP_SLUGS]
}

/**
 * Subscribe an organization to setup-enabled applications plus an explicit
 * source app. Billing/Invoice are never inferred from finance infrastructure.
 */
export async function ensureOrgAppSubscriptions(
  organizationId: string,
  options: {
    sourceAppId?: string | null
    selectionTimestamp?: number
  } = {}
): Promise<{ appIds: string[]; provisioned: string[] }> {
  const appIds: string[] = []

  for (const slug of await provisionedApplicationSlugs(
    organizationId,
    options.selectionTimestamp
  )) {
    const app = await repository.findAppBySlug(slug)
    if (!app) {
      log.error(
        { org_id: organizationId, slug },
        'provisioning.entitled_app_missing'
      )
      continue
    }
    if (!appIds.includes(app.id)) appIds.push(app.id)
  }

  // The source app comes from the authenticated API-key principal. It is an
  // explicit product request, not a location-policy inference.
  const sourceAppId = options.sourceAppId ?? null
  if (sourceAppId !== null && !appIds.includes(sourceAppId))
    appIds.push(sourceAppId)

  const provisioned: string[] = []
  for (const appId of appIds) {
    const existing = await repository.findSubscription(organizationId, appId)
    if (existing) {
      if (existing.status === 'active' && !existing.hasItems) {
        const defaultPrice = await repository.findDefaultPriceForApp(appId)
        if (defaultPrice)
          await repository.ensureSubscriptionDefaultPrice({
            subscriptionId: existing.id,
            itemId: generateId('subscriptionItem'),
            priceId: defaultPrice.id,
            now: BigInt(Math.floor(Date.now() / 1000)),
          })
      }
      continue
    }

    const defaultPrice = await repository.findDefaultPriceForApp(appId)
    await repository.provisionSubscription({
      id: generateId('subscription'),
      itemId: generateId('subscriptionItem'),
      organizationId,
      appId,
      priceId: defaultPrice?.id ?? null,
      status: 'active',
      now: BigInt(Math.floor(Date.now() / 1000)),
    })
    provisioned.push(appId)
  }

  if (provisioned.length > 0) {
    log.info(
      { org_id: organizationId, app_ids: provisioned },
      'provisioning.org_apps'
    )
  }

  return { appIds, provisioned }
}

export async function ensureOrgAppsFinanceReady(
  organizationId: string,
  options: { appIds?: string[] } = {}
): Promise<void> {
  const [{ ensureAppReady }, { createFinanceProvisioningRepository }] =
    await Promise.all([
      import('./finance-provisioning-readiness'),
      import('./finance-provisioning.repository'),
    ])

  const appIds =
    options.appIds ?? (await repository.listSubscribedAppIds(organizationId))
  const deps = { repository: createFinanceProvisioningRepository() }

  for (const appId of appIds) {
    await ensureAppReady(deps, { organizationId, appId })
  }
}

export async function provisionOrgApps(
  organizationId: string,
  options: { sourceAppId?: string | null; now?: number } = {}
): Promise<string[]> {
  const { appIds, provisioned } = await ensureOrgAppSubscriptions(
    organizationId,
    {
      sourceAppId: options.sourceAppId ?? null,
      selectionTimestamp: options.now,
    }
  )
  await ensureOrgAppsFinanceReady(organizationId, { appIds })
  return provisioned
}

/**
 * Idempotently provision roles, setup app entitlements, customer-registry
 * identity, and finance readiness.
 *
 * A fresh organization is selected automatically when its `createdAt` equals
 * the bootstrap timestamp passed here. Older unselected organizations are not
 * routed implicitly; callers that require Phase 2 semantics use
 * `requireProvisioningSelection` and receive a stable 409 until backfill.
 */
export async function provisionOrganization(
  organizationId: string,
  now: number,
  options: {
    sourceAppId?: string | null
    enqueueCustomerEnsure?: EnqueueCustomerEnsure
    deferFinanceReadiness?: boolean
    requireProvisioningSelection?: boolean
  } = {}
): Promise<Record<string, OrgRoleRow>> {
  if (options.requireProvisioningSelection) {
    await requirePersistedProvisioningPolicy(organizationId)
  } else {
    await resolveFreshProvisioningPolicy(organizationId, now)
  }

  const roles = await seedDefaultRoles(organizationId, now)
  const { appIds } = await ensureOrgAppSubscriptions(organizationId, {
    sourceAppId: options.sourceAppId ?? null,
    selectionTimestamp: now,
  })

  const organization = await repository.findOrganization(organizationId)
  if (organization)
    await (options.enqueueCustomerEnsure ?? defaultEnqueueCustomerEnsure)(
      organizationId,
      now
    )

  if (!options.deferFinanceReadiness)
    await ensureOrgAppsFinanceReady(organizationId, { appIds })

  return roles
}

export async function ensureDefaultContact(
  organizationId: string,
  user: {
    id: string
    firstName: string
    lastName: string | null
    email: string | null
    phone: string | null
  },
  now: number
): Promise<void> {
  if ((await repository.listOrgContacts(organizationId)).length > 0) return

  await repository.createOrgContact({
    id: generateId('orgContact'),
    organizationId,
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    type: 'general',
    isPrimary: true,
    email: user.email,
    phone: user.phone,
    createdAt: BigInt(now),
    updatedAt: BigInt(now),
  })

  log.info(
    { org_id: organizationId, user_id: user.id },
    'provisioning.default_contact'
  )
}

export async function resolveMemberPermissions(membership: {
  roleId: string | null
  organizationId: string
  role: string
}): Promise<Set<string>> {
  if (membership.roleId) {
    const role = await repository.findRoleForOrg(
      membership.roleId,
      membership.organizationId
    )
    if (role) return new Set(role.permissions)
  }

  return new Set(defaultPermissionsForRoleName(membership.role))
}

export async function resolveRoleId(
  organizationId: string,
  roleName: string
): Promise<string | null> {
  const role = await repository.findRoleByName(organizationId, roleName)
  return role?.id ?? null
}

export async function linkMembershipRole(
  membership: {
    id: string
    organizationId: string
    role: string
    roleId: string | null
  },
  now: number
): Promise<void> {
  const roleId = await resolveRoleId(membership.organizationId, membership.role)
  if (membership.roleId === roleId) return

  await repository.updateMembershipRole(membership.id, roleId, BigInt(now))
}

/**
 * Assign the member every setup-enabled application plus the explicit source
 * app. Existing assignments are upserted, so retries are safe.
 */
export async function assignMemberApps(params: {
  organizationId: string
  userId: string
  now: number
  sourceAppId?: string | null
  assignedBy?: string | null
}): Promise<void> {
  const now = BigInt(params.now)
  const assignedBy = params.assignedBy ?? null
  const appIds: string[] = []

  for (const slug of await provisionedApplicationSlugs(
    params.organizationId,
    params.now
  )) {
    const app = await repository.findAppBySlug(slug)
    if (app && !appIds.includes(app.id)) appIds.push(app.id)
  }

  const sourceAppId = params.sourceAppId ?? null
  if (sourceAppId && !appIds.includes(sourceAppId)) appIds.push(sourceAppId)

  for (const appId of appIds) {
    await repository.assignApp({
      id: generateId('appAssignment'),
      organizationId: params.organizationId,
      userId: params.userId,
      appId,
      assignedBy,
      now,
    })
  }
}
