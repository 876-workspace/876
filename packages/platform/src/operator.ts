import 'server-only'

import { create876AdminClient } from './client'
import type { Admin876ClientOptions } from './client'

/** Creates the genuinely platform-wide 876 operator surface. */
export function create876PlatformOperatorClient(
  options: Admin876ClientOptions = {}
) {
  const core = create876AdminClient(options)
  return {
    auditEvents: core.auditEvents,
    messages: core.messages,
    calls: core.calls,
    phoneLookups: core.phoneLookups,
    users: core.users,
    identifications: core.identifications,
    auth: core.auth,
    authAttempts: core.authAttempts,
    devices: core.devices,
    sessions: core.sessions,
    apiKeys: core.apiKeys,
    apps: core.apps,
    appFeatures: core.appFeatures,
    organizations: core.organizations,
    products: core.products,
    prices: core.prices,
    subscriptions: core.subscriptions,
    geo: core.geo,
    reservedUsernames: core.reservedUsernames,
  }
}

export type PlatformOperatorClient = ReturnType<
  typeof create876PlatformOperatorClient
>
export type PlatformOperatorClientOptions = Admin876ClientOptions
