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
 *
 * `app` is accepted for parity with the server client (routing/telemetry
 * metadata), but it is **not** forwarded to the underlying SDK: the SDK parses
 * its options with a `z.strictObject`, which throws on any unknown key — so
 * passing `app` through would make `create876Client({ app })` fail at runtime.
 * Strip it here until it has a documented consumer.
 */
export function create876Client({
  app: _app,
  ...platformOptions
}: ClientOptions = {}) {
  const platform = createPlatformClient(platformOptions)

  return {
    auth: platform.auth,
    sessions: {
      me: {
        retrieve: platform.auth.getSession,
        list: platform.auth.me.listSessions,
        revoke: platform.auth.me.revokeSession,
      },
    },
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

    mobileNumbers: platform.mobileNumbers,
    mobileNumberVerifications: platform.mobileNumberVerifications,

    permissions: platform.permissions,

    notes: browserNotes,
    collections: browserCollections,
  }
}

export type Client876 = ReturnType<typeof create876Client>
export type { PlatformClientOptions }
export type {
  Customer as CrmCustomer,
  CustomerList as CrmCustomerList,
  CustomerProfile as CrmCustomerProfile,
  CustomerProfileStatus as CrmCustomerProfileStatus,
  CreateCustomerInput as CrmCustomerCreateInput,
  UpdateCustomerInput as CrmCustomerUpdateInput,
  CrmRequest,
  RequestList as CrmRequestList,
  RequestStatus,
  RequestPriority,
  RequestCategory,
  RequestSource,
  CreateRequestInput as CrmRequestCreateInput,
  UpdateRequestInput as CrmRequestUpdateInput,
} from '@876/crm'
