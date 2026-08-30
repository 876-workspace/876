import type { GuardResolver } from '../../http/api-router.js'
import { createApiRouter } from '../../http/api-router.js'
import * as controller from './tenants.controller.js'

export function createTenantsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter(resolveGuards)
  api.post({
    path: '/',
    security: { kind: 'operator' },
    handler: controller.ensureTenant,
  })
  return api.router
}
