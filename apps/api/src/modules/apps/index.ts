/**
 * The `apps` module's public surface.
 *
 * Only the credential lookups the auth guards need are exported so far; the
 * app CRUD routes arrive with the module's own router.
 */
export { findApiKeyByHash, markApiKeyUsed } from './apps.service'
export { createAppsRouter, createAppsPublicRouter } from './apps.routes'
