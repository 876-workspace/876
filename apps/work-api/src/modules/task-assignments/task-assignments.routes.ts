import { createApiRouter, type GuardResolver } from '../../http/api-router.js'
import * as controller from './task-assignments.controller.js'

export function createTaskAssignmentsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter(resolveGuards)
  api.get({
    path: '/',
    security: {
      kind: 'integration',
      scope: 'work.tasks.read',
      sessionPermissions: ['tasks.view'],
    },
    handler: controller.listAssignments,
  })
  api.post({
    path: '/',
    security: {
      kind: 'integration',
      scope: 'work.tasks.write',
      sessionPermissions: ['tasks.assign'],
    },
    handler: controller.createAssignment,
  })
  api.patch({
    path: '/:assignmentId',
    security: {
      kind: 'integration',
      scope: 'work.tasks.write',
      sessionPermissions: ['tasks.assign'],
    },
    handler: controller.updateAssignment,
  })
  api.patch({
    path: '/:assignmentId/response',
    security: {
      kind: 'integration',
      scope: 'work.tasks.write',
      sessionPermissions: ['tasks.respond'],
    },
    handler: controller.respondToAssignment,
  })
  api.delete({
    path: '/:assignmentId',
    security: {
      kind: 'integration',
      scope: 'work.tasks.write',
      sessionPermissions: ['tasks.assign'],
    },
    handler: controller.deleteAssignment,
  })
  return api.router
}
