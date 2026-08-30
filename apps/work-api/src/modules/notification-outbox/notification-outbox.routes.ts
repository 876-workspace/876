import { createApiRouter, type GuardResolver } from '../../http/api-router.js'
import { runNotifications } from './notification-outbox.controller.js'
export function createNotificationOutboxRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter(resolveGuards)
  api.post({
    path: '/run',
    security: { kind: 'scheduler' },
    handler: runNotifications,
  })
  return api.router
}
