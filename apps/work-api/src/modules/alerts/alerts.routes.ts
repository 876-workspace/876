import { createApiRouter, type GuardResolver } from '../../http/api-router.js'
import * as controller from './alerts.controller.js'
export function createAlertsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter(resolveGuards)
  api.get({ path: '/', security: { kind: 'integration', scope: 'work.alerts.read', sessionPermissions: ['reminders.view', 'events.view', 'tasks.view'] }, handler: controller.listAlerts })
  api.post({ path: '/', security: { kind: 'integration', scope: 'work.alerts.write', sessionPermissions: ['reminders.create', 'events.edit', 'tasks.edit'] }, handler: controller.createAlert })
  api.get({ path: '/:alertId', security: { kind: 'integration', scope: 'work.alerts.read', sessionPermissions: ['reminders.view', 'events.view', 'tasks.view'] }, handler: controller.retrieveAlert })
  api.patch({ path: '/:alertId', security: { kind: 'integration', scope: 'work.alerts.write', sessionPermissions: ['reminders.edit', 'events.edit', 'tasks.edit'] }, handler: controller.updateAlert })
  api.delete({ path: '/:alertId', security: { kind: 'integration', scope: 'work.alerts.write', sessionPermissions: ['reminders.delete', 'events.edit', 'tasks.edit'] }, handler: controller.deleteAlert })
  return api.router
}
