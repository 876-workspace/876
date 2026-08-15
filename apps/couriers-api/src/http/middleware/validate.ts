/**
 * Request validation is a shared 876 server primitive (`@876/server/express`).
 * This module re-exports it so existing `@/http/middleware/validate` imports
 * keep working; new code may import from `@876/server/express` directly.
 */
export {
  validate,
  validBody,
  validQuery,
  validParams,
  type ValidationSchemas,
  type Validated,
} from '@876/server/express'
