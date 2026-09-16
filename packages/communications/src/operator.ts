import 'server-only'

import { create876CommunicationsClient } from './client'
import type { ClientOptions } from './types'

/**
 * 876 operator access to the Communications boundary, for Console administering
 * any organization's email configuration and reading its delivery evidence.
 *
 * This entrypoint records **caller intent**: an operator host imports it so its
 * authority is visible at the call site, as `access-tiers.md` requires. It does
 * not yet carry a distinct credential class — Communications currently exposes
 * one internal-key tier, so this aliases the same client the `service`
 * entrypoint builds, exactly as `@876/storage`'s operator and service
 * entrypoints do today. Do not describe these as separate key classes or
 * separate backend routes until the service enforces that distinction.
 *
 * Naming it separately is still worth it: Console's imports say what authority
 * they exercise, and the day Communications gains an operator-only tier there is
 * one place to change rather than every call site.
 *
 * Authorization remains the backend's and the host's job. Console must pass its
 * own permission check before touching this client and must write an audit event
 * for any read of customer-identifying delivery content and for every mutation.
 */
export function create876CommunicationsOperatorClient(
  options: ClientOptions = {}
) {
  return create876CommunicationsClient(options)
}

export type CommunicationsOperatorClient = ReturnType<
  typeof create876CommunicationsOperatorClient
>
export type CommunicationsOperatorClientOptions = ClientOptions
