import { generateId } from '@/platform/ids'
import { getLogger } from '@/platform/logger'
import {
  DEFAULT_ORG_ROLES,
  defaultPermissionsForRoleName,
} from '@/platform/permissions'

import * as repository from './provisioning.repository'
import type { OrgRoleRow } from './provisioning.repository'
import { enqueueCustomerEnsureForOrganization } from './billing-customer-sync'
import { createBillingCustomerSyncRepository } from './billing-customer-sync.repository'

/**
 * Organization provisioning: default roles, app entitlements, member
 * assignments.
 *
 * 1. When an organization is created — by business registration, the admin API,
 *    or a product-app onboarding flow — it is provisioned with its default role
 *    set and an active subscription to the default apps.
 * 2. When a member joins — creation, invite accept, or SSO — their membership
 *    is linked to the org role matching their role name, and they are assigned
 *    the Enterprise app plus the source app when they arrived through one.
 *
 * Members added through the Enterprise directory itself get **no** product-app
 * assignments; those are granted explicitly through `apps:assign`.
 */

const log = getLogger('provisioning')

/**
 * Every org is entitled to the Enterprise directory app — membership in the org
 * is what admits a user to it, though assignments are still written so the
 * roster reads consistently.
 */
export const ENTERPRISE_APP_SLUG = '876-enterprise'

/**
 * Billing is the organization's financial plane — invoices, payment methods and
 * the customer registry all hang off it — so an org has it from the moment it
 * exists, the way a Google account reaches Drive without a separate sign-up.
 * Heavier surfaces stay behind explicit setup.
 */
export const BILLING_APP_SLUG = '876-billing'

/** Provisioned for every new organization, wherever it signed up. */
/** 876 Invoice — the entry-level invoicing product every organization gets. */
export const INVOICE_APP_SLUG = '876-invoice'

export const DEFAULT_ORG_APP_SLUGS = [
  ENTERPRISE_APP_SLUG,
  BILLING_APP_SLUG,
  INVOICE_APP_SLUG,
] as const

/**
 * Called once an organization has been provisioned, so the billing registry
 * learns about it.
 *
 * Injected rather than imported so provisioning does not depend on the billing
 * customer sync — the two are ported independently, and a service that reaches
 * sideways into another is what makes either one impossible to test alone.
 */
export type EnqueueCustomerEnsure = (
  organizationId: string,
  now: number
) => Promise<void>

/**
 * The default `customer.ensure` enqueue used by every org-creation path (admin
 * create, business signup, product-app onboarding), so a new org lands in the
 * Billing registry at creation rather than only on the reconcile sweep.
 *
 * Best-effort: a failure is logged, never raised — an org must be creatable even
 * when the billing outbox write hiccups, and the reconcile sweep re-ensures any
 * org it finds. Tests inject their own enqueue and never reach this.
 */
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
  } catch (error) {
    log.error(
      { err: error, org_id: organizationId },
      'provisioning.customer_ensure_failed'
    )
  }
}

/**
 * Idempotently seed an organization's default system roles.
 *
 * An existing row is kept as-is rather than overwritten: an org that has
 * customised a system role's permissions must not have that silently reverted
 * by a re-seed.
 */
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

/**
 * Subscribe an org to its default apps plus the app it signed up through.
 *
 * This is the **durable** half of app provisioning: it only creates/reuses
 * subscription rows and never touches Billing, so it cannot be interrupted by
 * an unavailable finance service. Idempotent, and it never fails provisioning:
 * a missing app row means a partially seeded environment, which is worth
 * shouting about but is not a reason to fail somebody's signup.
 *
 * Returns both the full set of resolved app ids the org is entitled to (`appIds`
 * — the set the finance-readiness pass runs over, so an app whose Billing tenant
 * was never opened is repaired even when its subscription already existed) and
 * the subset that was newly created on this call (`provisioned`).
 */
export async function ensureOrgAppSubscriptions(
  organizationId: string,
  options: { sourceAppId?: string | null } = {}
): Promise<{ appIds: string[]; provisioned: string[] }> {
  const appIds: string[] = []

  for (const slug of DEFAULT_ORG_APP_SLUGS) {
    const app = await repository.findAppBySlug(slug)
    if (!app) {
      log.error(
        { org_id: organizationId, slug },
        'provisioning.default_app_missing'
      )
      continue
    }
    appIds.push(app.id)
  }

  // The source app is identified by the API key the request authenticated
  // with, so a client cannot claim to be a different app and be provisioned
  // onto it.
  const sourceAppId = options.sourceAppId ?? null
  if (sourceAppId !== null && !appIds.includes(sourceAppId))
    appIds.push(sourceAppId)

  const provisioned: string[] = []
  for (const appId of appIds) {
    if (await repository.findSubscription(organizationId, appId)) continue

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

/**
 * Make every app an org is subscribed to fully usable, going through the same
 * readiness contract as explicit app activation.
 *
 * `ensureAppReady` derives *whether* an app needs a Billing workspace from its
 * published profile, so a finance-dependent app (876 Invoice) is guaranteed a
 * delivered finance connection while a finance-less app (876-enterprise,
 * 876-billing) returns immediately. This replaces the old org-wide reconcile
 * whose `eventIds.length > 0` conditional silently skipped delivery whenever a
 * matching event already existed — the exact gap that let a bootstrapped
 * Invoice org open with no Billing tenant.
 *
 * `appIds` may be supplied by the caller that just created the subscriptions;
 * otherwise the org's subscribed apps are re-derived, so a retry after a
 * Billing outage repairs the same org without the caller re-computing the set.
 */
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

/**
 * Subscribe an org to its default apps and make each one usable.
 *
 * Kept as the combined form for callers that do not need the durable/finance
 * split — it runs subscriptions first, then finance readiness. Callers that
 * must establish durable identity (the owner membership) before the finance
 * barrier use {@link ensureOrgAppSubscriptions} and
 * {@link ensureOrgAppsFinanceReady} directly.
 *
 * Returns the app ids newly subscribed on this call.
 */
export async function provisionOrgApps(
  organizationId: string,
  options: { sourceAppId?: string | null } = {}
): Promise<string[]> {
  const { appIds, provisioned } = await ensureOrgAppSubscriptions(
    organizationId,
    options
  )
  await ensureOrgAppsFinanceReady(organizationId, { appIds })
  return provisioned
}

/**
 * Idempotently provision an org: default roles plus app entitlements.
 *
 * Returns the org's system roles keyed by name, so a caller can link the
 * creator's membership without a second query.
 */
export async function provisionOrganization(
  organizationId: string,
  now: number,
  options: {
    sourceAppId?: string | null
    enqueueCustomerEnsure?: EnqueueCustomerEnsure
    /**
     * Skip the finance-workspace readiness pass, leaving only the durable
     * subscription rows in place. The caller must run
     * {@link ensureOrgAppsFinanceReady} itself once the durable organization
     * identity (its owner membership) has been recorded, so a finance outage
     * cannot strand a usable org without a membership its owner can route to.
     */
    deferFinanceReadiness?: boolean
  } = {}
): Promise<Record<string, OrgRoleRow>> {
  const roles = await seedDefaultRoles(organizationId, now)

  const { appIds } = await ensureOrgAppSubscriptions(organizationId, {
    sourceAppId: options.sourceAppId ?? null,
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

/**
 * Seed the org's default primary contact from its owner.
 *
 * Idempotent: does nothing once the org has any contact. Contacts can later be
 * re-pointed, demoted, or extended with non-member people — this only
 * guarantees a new org starts with its owner as the primary contact.
 */
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

/**
 * The effective org permissions for a membership.
 *
 * The linked organization role wins. A membership not yet linked — or whose
 * role row was deleted — falls back to the code-default set for its role name,
 * so a missing row degrades to the documented default rather than to no
 * permissions at all.
 */
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

/** The org-role row id for a role name; null when the org has no such role. */
export async function resolveRoleId(
  organizationId: string,
  roleName: string
): Promise<string | null> {
  const role = await repository.findRoleByName(organizationId, roleName)
  return role?.id ?? null
}

/** Point `membership.roleId` at the org role matching its role name. */
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

/** Assign a member the Enterprise directory app, plus the source app if any. */
export async function assignMemberApps(params: {
  organizationId: string
  userId: string
  now: number
  sourceAppId?: string | null
  assignedBy?: string | null
}): Promise<void> {
  const now = BigInt(params.now)
  const assignedBy = params.assignedBy ?? null
  const enterprise = await repository.findAppBySlug(ENTERPRISE_APP_SLUG)

  if (enterprise)
    await repository.assignApp({
      id: generateId('appAssignment'),
      organizationId: params.organizationId,
      userId: params.userId,
      appId: enterprise.id,
      assignedBy,
      now,
    })

  const sourceAppId = params.sourceAppId ?? null
  if (sourceAppId && (!enterprise || sourceAppId !== enterprise.id))
    await repository.assignApp({
      id: generateId('appAssignment'),
      organizationId: params.organizationId,
      userId: params.userId,
      appId: sourceAppId,
      assignedBy,
      now,
    })
}
