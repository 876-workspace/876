import { createApiRouter, type GuardResolver } from '../../http/api-router.js'
import * as controller from './recurrence-rules.controller.js'

export function createRecurrenceRulesRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter(resolveGuards)
  api.get({
    path: '/',
    security: {
      kind: 'integration',
      scope: 'work.tasks.read',
      sessionPermissions: ['tasks.view', 'events.view'],
    },
    handler: controller.listRules,
  })
  api.post({
    path: '/',
    security: {
      kind: 'integration',
      scope: 'work.tasks.write',
      sessionPermissions: ['tasks.edit', 'events.edit'],
    },
    handler: controller.createRule,
  })
  api.get({
    path: '/:ruleId',
    security: {
      kind: 'integration',
      scope: 'work.tasks.read',
      sessionPermissions: ['tasks.view', 'events.view'],
    },
    handler: controller.retrieveRule,
  })
  api.patch({
    path: '/:ruleId',
    security: {
      kind: 'integration',
      scope: 'work.tasks.write',
      sessionPermissions: ['tasks.edit', 'events.edit'],
    },
    handler: controller.updateRule,
  })
  api.delete({
    path: '/:ruleId',
    security: {
      kind: 'integration',
      scope: 'work.tasks.write',
      sessionPermissions: ['tasks.edit', 'events.edit'],
    },
    handler: controller.deleteRule,
  })
  return api.router
}
