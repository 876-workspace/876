/**
 * Internal Core API session projection used by `@876/workspace` while account
 * and workspace share one deployed Core API. Application code must import the
 * public bounded clients instead of this entrypoint.
 */
export { create876Client as create876CoreSessionClient } from './client.ts'
export type { SDK876Client as CoreSessionClient } from './client.ts'
export type { ClientOptions as CoreSessionClientOptions } from './types/api.ts'
