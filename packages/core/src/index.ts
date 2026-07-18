// @876/core — shared foundation for the 876 monorepo.
//
// Holds the cross-cutting primitives consumed by the domain SDK packages
// (@876/sdk, @876/admin) and the apps: the error registry and
// getError, id generation, timestamp helpers, and base API/error contracts.
// Subpath exports (e.g. '@876/core/errors') are also
// available; this barrel is a convenience aggregate.
export * from './lib/errors'
export * from './lib/id'
export * from './lib/timestamps'

export * from './types/errors'
export * from './types/api'
export * from './types/id'
export * from './api'

export * from './types/accounts-errors'
export * from './types/addresses-errors'
export * from './types/api-keys-errors'
export * from './types/app-assignments-errors'
export * from './types/apps-errors'
export * from './types/auth-errors'
export * from './types/contacts-errors'
export * from './types/departments-errors'
export * from './types/employees-errors'
export * from './types/features-errors'
export * from './types/invites-errors'
export * from './types/locations-errors'
export * from './types/memberships-errors'
export * from './types/oauth-grants-errors'
export * from './types/organizations-errors'
export * from './types/products-errors'
export * from './types/profiles-errors'
export * from './types/provisioning'
export * from './types/provider-errors'
export * from './types/reserved-usernames-errors'
export * from './types/roles-errors'
export * from './types/sessions-errors'
export * from './types/subscriptions-errors'
export * from './types/user-errors'
export * from './types/user-features-errors'

// Shared client runtime and bridge transport.
export {
  buildClientQuery,
  DEFAULT_DEVELOPMENT_API_BASE_URL,
  DEFAULT_PRODUCTION_API_BASE_URL,
  isProductionEnv,
  readClientEnv,
  resolve876ApiBaseUrl,
  resolveClientBaseUrl,
  resolveClientUrl,
  requestApiResult,
  readApiResult,
  sendClientRequest,
  CLIENT_INVALID_RESPONSE_ERROR,
  NETWORK_OFFLINE_ERROR,
} from './client'
export type {
  ClientApiResult,
  ClientAppError,
  ClientHttpMethod,
  ClientHttpResult,
  ClientRequestInit,
  ClientRetryOptions,
  ClientTransport,
  ResourceFactory,
} from './client'
export {
  apiBridgeUrl,
  appendSetCookies,
  copyBridgeResponse,
  DEFAULT_SERVER_API_BASE_URL,
  fetchApiBridge,
  getSetCookies,
} from './fetch/bridge'
export type {
  ApiBridgeRequestInit,
  ApiBridgeRetryOptions,
} from './fetch/bridge'
