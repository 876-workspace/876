import { create876Client } from './client.ts'
import type { ClientOptions } from './types/api.ts'

/**
 * Creates the application-facing 876 Account client.
 *
 * This deliberately projects only identity/account resources. Organization
 * workspace resources are exposed by `@876/workspace`, and product resources
 * live in their owning product packages.
 */
export function create876AccountClient(options: ClientOptions = {}) {
  const core = create876Client(options)
  return {
    auth: core.auth,
    oauth: core.oauth,
    oauthGrants: core.oauthGrants,
    auditEvents: core.auditEvents,
    users: core.users,
    apps: core.apps,
    /** Self-scoped app role and effective-permission reads for the actor. */
    appMemberships: core.appMemberships,
    mobileNumbers: core.mobileNumbers,
    mobileNumberVerifications: core.mobileNumberVerifications,
  }
}

export type AccountClient = ReturnType<typeof create876AccountClient>
export type AccountClientOptions = ClientOptions
