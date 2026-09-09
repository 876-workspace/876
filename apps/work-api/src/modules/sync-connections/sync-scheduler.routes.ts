import { createApiRouter, type GuardResolver } from '../../http/api-router.js'
import { sendWorkResult } from '../../http/result.js'
import { syncActiveConnections } from './sync-run.service.js'

export function createSyncSchedulerRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter(resolveGuards)
  api.post({
    path: '/run',
    security: { kind: 'scheduler' },
    handler: async (_req, res) =>
      sendWorkResult(res, await syncActiveConnections()),
  })
  return api.router
}
