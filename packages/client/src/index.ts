import {
  create876Client as createPlatformClient,
  type ClientOptions as PlatformClientOptions,
} from '@876/sdk'
import { browserNotes, browserCollections } from '@876/widgets/browser'
import type { AppId } from './context/types.ts'

export interface ClientOptions extends PlatformClientOptions {
  app?: AppId
}

/**
 * Browser-safe `$876` client. Only resources that can genuinely work in a
 * browser runtime are composed — server-only/privileged resources are simply
 * absent from the type, never typed as `undefined`.
 */
export function create876Client(options: ClientOptions = {}) {
  const platform = createPlatformClient(options)

  return {
    auth: platform.auth,
    oauth: platform.oauth,
    auditEvents: platform.auditEvents,

    users: {
      me: platform.users,
    },

    organizations: platform.organizations,
    memberships: platform.memberships,
    apps: platform.apps,
    features: platform.features,
    entitlements: platform.subscriptions,

    locations: platform.locations,
    contacts: platform.contacts,
    departments: platform.departments,
    employees: platform.employees,
    roles: platform.roles,

    organizationMembers: platform.organizationMembers,
    appAssignments: platform.appAssignments,
    invites: platform.invites,

    permissions: platform.permissions,

    notes: browserNotes,
    collections: browserCollections,
  }
}

export type Client876 = ReturnType<typeof create876Client>
export type { PlatformClientOptions }
