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
import { createAdminCommunicationsResource } from './resources/communications'
import { createAdminSubscriptionsResource } from './resources/subscriptions'
import type { AdminPlatformClientOptions } from './types'

export type Admin876ClientOptions = AdminPlatformClientOptions & {
  /** Billing administration and cross-application integration configuration. */
  billing?: BillingAdminClientOptions & BillingIntegrationClientOptions
  /** Storage service configuration. */
  storage?: StorageClientOptions
  /** Widgets member and administration configuration. */
  widgets?: CreateWidgetsClientOptions
}

export function create876AdminClient(options: Admin876ClientOptions = {}) {
  const runtime = buildAdminRuntime(options)
  const { identifications, ...users } = createAdminUsersResource(runtime)
  const {
    features: appFeatures,
    subscriptions: appSubscriptions,
    ...apps
  } = createAdminAppsResource(runtime)
  const { orgs: organizationFeatures, ...features } =
    createAdminFeaturesResource(runtime)
  const {
    locations,
    contacts,
    departments,
    employees,
    subscriptions: organizationSubscriptions,
    permissions,
    roles,
    members: organizationMembers,
    appAssignments,
    listMemberships: _listMemberships,
    createMembership: _createMembership,
    listInvites,
    createInvite,
    revokeInvite,
    ...organizations
  } = createAdminOrgsResource(runtime)
  const subscriptions = createAdminSubscriptionsResource(runtime)
  const communications = createAdminCommunicationsResource(runtime)
  const billing = create876BillingAdminClient(options.billing)
  const widgets = createWidgetsClient(options.widgets)

  return {
    auditEvents: createAdminAuditEventsResource(runtime),
    messages: communications.messages,
    phoneLookups: communications.phoneLookups,
    users,
    identifications,
    auth: createAdminAuthResource(runtime),
    apps,
    appFeatures,
    appSubscriptions,
    features,
    organizationFeatures,
    apiKeys: createAdminApiKeysResource(runtime),
    organizations,
    locations,
    contacts,
    departments,
    employees,
    permissions,
    roles,
    organizationMembers,
    appAssignments,
    invites: {
      list: listInvites,
      create: createInvite,
      revoke: revokeInvite,
    },
    prices: createAdminPricesResource(runtime),
    products: createAdminProductsResource(runtime),
    onboarding: createAdminOnboardingResource(runtime),
    provisioning: createAdminProvisioningResource(runtime),
    memberships: createAdminMembershipsResource(runtime),
    modules: createAdminModulesResource(runtime),
    addresses: createAdminAddressesResource(runtime),
    reservedUsernames: createAdminReservedUsernamesResource(runtime),
    billingAccounts: createAdminBillingAccountsResource(runtime),
    subscriptions: {
      ...subscriptions,
      provision: organizationSubscriptions.provision,
      updateForOrganizationApp: organizationSubscriptions.update,
      listForOrganization: organizationSubscriptions.list,
      retrieveForOrganizationApp: organizationSubscriptions.retrieve,
      retrieveBySlug: organizationSubscriptions.retrieveBySlug,
      listByOrganizations: organizationSubscriptions.listByOrgs,
    },
    storage: create876StorageClient(options.storage),
    billing: {
      ...billing,
      integration: create876BillingIntegrationClient(options.billing),
    },
    widgets: { ...widgets, ...createWidgetsAdminClient(options.widgets) },
  }
}

export type Admin876Client = ReturnType<typeof create876AdminClient>
