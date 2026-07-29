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

import {
  create876AdminClient as create876BillingAdminClient,
  type AdminClientOptions as BillingAdminClientOptions,
} from '@876/billing/admin'
import {
  create876BillingIntegrationClient,
  type IntegrationClientOptions as BillingIntegrationClientOptions,
} from '@876/billing/integration'
import { create876StorageClient, type StorageClientOptions } from '@876/storage'
import {
  createWidgetsClient,
  type CreateWidgetsClientOptions,
} from '@876/widgets/server'
import { createWidgetsAdminClient } from '@876/widgets/server/admin'

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
import type { AdminPlatformClientOptions } from './types'

export type Admin876ClientOptions = {
  /** Core platform administration configuration. */
  platform?: AdminPlatformClientOptions
  /** Billing administration and cross-application integration configuration. */
  billing?: BillingAdminClientOptions & BillingIntegrationClientOptions
  /** Storage service configuration. */
  storage?: StorageClientOptions
  /** Widgets member and administration configuration. */
  widgets?: CreateWidgetsClientOptions
}

export function create876AdminClient(options: Admin876ClientOptions = {}) {
  const runtime = buildAdminRuntime(options.platform ?? {})
  const userResources = createAdminUsersResource(runtime)
  const {
    create: createUser,
    list: listUsers,
    retrieve: getUserById,
    retrieveByWorkosId: getUserByWorkosId,
    retrieveByUsername: getUserByUsername,
    update: updateUserById,
    delete: deleteUser,
    purge: purgeUser,
    ban: banUser,
    unban: unbanUser,
    listAccounts: listUserAccounts,
    unlinkAccount: unlinkUserAccount,
    revokeSessions: revokeUserSessions,
    ...users
  } = userResources
  const billing = create876BillingAdminClient(options.billing)
  const widgets = createWidgetsClient(options.widgets)

  return {
    auditEvents: createAdminAuditEventsResource(runtime),
    users,
    auth: {
      ...createAdminAuthResource(runtime),
      admin: {
        createUser,
        listUsers,
        getUserById,
        getUserByWorkosId,
        getUserByUsername,
        updateUserById,
        deleteUser,
        purgeUser,
        banUser,
        unbanUser,
        listUserAccounts,
        unlinkUserAccount,
        revokeUserSessions,
      },
    },
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
    storage: create876StorageClient(options.storage),
    billing: {
      ...billing,
      integration: create876BillingIntegrationClient(options.billing),
    },
    widgets: {
      ...widgets,
      admin: createWidgetsAdminClient(options.widgets),
    },
  }
}

export type Admin876Client = ReturnType<typeof create876AdminClient>
