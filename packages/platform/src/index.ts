/** `@876/platform` — global 876 operator control plane. */
import 'server-only'

export { create876PlatformOperatorClient } from './operator'
export type {
  PlatformOperatorClient,
  PlatformOperatorClientOptions,
} from './operator'
export { isDeleted, isDefault, isExpired, isRevoked } from './helpers'
export {
  AdminLookupError,
  isNotFoundError,
  unwrapOptional,
  unwrapResult,
} from './lookup'
export type { AdminError } from './lookup'
export type * from './types'
