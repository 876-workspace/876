import 'server-only'

/**
 * Internal full Core API operator projection used by `@876/workspace` while
 * workspace and platform share one deployed Core API. App code should use the
 * public `platform` or `workspace` clients instead.
 */
export { create876AdminClient as create876CoreOperatorClient } from './client'
export type {
  Admin876Client as CoreOperatorClient,
  Admin876ClientOptions as CoreOperatorClientOptions,
} from './client'
