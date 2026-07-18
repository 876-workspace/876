/**
 * Admin API client factory.
 *
 * Composes the internal-key-tier resource modules over one shared runtime.
 * Every `AdminDep` operation lives here and only here — consumer apps import
 * `@876/sdk` instead, so admin-only surface (e.g. platform-wide `users.list`)
 * never reaches their bundles. The surface of this client is exactly the set
 * of resource factories composed below.
 *
 * @module @876/admin/client
 */

import { buildAdminRuntime } from './runtime'
import { createAdminAddressesResource } from './resources/addresses'
import { createAdminApiKeysResource } from './resources/api-keys'
import { createAdminAppsResource } from './resources/apps'
import { createAdminAuditEventsResource } from './resources/audit-events'
import { createAdminAuthResource } from './resources/auth'
import { createAdminFeaturesResource } from './resources/features'
import { createAdminMembershipsResource } from './resources/memberships'
import { createAdminModulesResource } from './resources/modules'
import { createAdminOnboardingResource } from './resources/onboarding'
import { createAdminOrgsResource } from './resources/orgs'
import { createAdminPricesResource } from './resources/prices'
import { createAdminProductsResource } from './resources/products'
import { createAdminProvisioningResource } from './resources/provisioning'
import { createAdminReservedUsernamesResource } from './resources/reserved-usernames'
import { createAdminUsersResource } from './resources/users'
import { createAdminBillingAccountsResource } from './resources/billing-accounts'
import { createAdminSubscriptionsResource } from './resources/subscriptions'
import type { Admin876ClientOptions } from './types'

export function create876AdminClient(options: Admin876ClientOptions = {}) {
  const runtime = buildAdminRuntime(options)

  return {
    auditEvents: createAdminAuditEventsResource(runtime),
    users: createAdminUsersResource(runtime),
    auth: createAdminAuthResource(runtime),
    apps: createAdminAppsResource(runtime),
    features: createAdminFeaturesResource(runtime),
    apiKeys: createAdminApiKeysResource(runtime),
    orgs: createAdminOrgsResource(runtime),
    prices: createAdminPricesResource(runtime),
    products: createAdminProductsResource(runtime),
    onboarding: createAdminOnboardingResource(runtime),
    provisioning: createAdminProvisioningResource(runtime),
    memberships: createAdminMembershipsResource(runtime),
    modules: createAdminModulesResource(runtime),
    addresses: createAdminAddressesResource(runtime),
    reservedUsernames: createAdminReservedUsernamesResource(runtime),
    billingAccounts: createAdminBillingAccountsResource(runtime),
    subscriptions: createAdminSubscriptionsResource(runtime),
  }
}

export type Admin876Client = ReturnType<typeof create876AdminClient>
