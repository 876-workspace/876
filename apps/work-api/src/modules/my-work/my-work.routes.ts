import { createApiRouter, type GuardResolver } from '../../http/api-router.js'
import { retrieveMyWork } from './my-work.controller.js'

export function createMyWorkRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter(resolveGuards)
  api.get({
    path: '/',
    security: {
      kind: 'integration',
      scope: 'work.my-work.read',
      sessionPermissions: ['my_work.view'],
    },
    handler: retrieveMyWork,
  })
  return api.router
}
