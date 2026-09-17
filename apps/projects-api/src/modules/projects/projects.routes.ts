import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import { requireInternalKeyOrSession } from '../../http/session-auth.js'
import * as baselinesController from './baselines.controller.js'
import * as ganttController from './gantt.controller.js'
import * as controller from './projects.controller.js'

export function createProjectsRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternalKeyOrSession({ module: 'projects', permission: 'projects.view' }), controller.list)
  router.post('/', requireInternalKey, controller.create)
  router.get(
    '/baselines/:baselineId',
    requireInternalKey,
    baselinesController.retrieveBaseline
  )
  router.delete(
    '/baselines/:baselineId',
    requireInternalKey,
    baselinesController.removeBaseline
  )
  router.get('/:projectId', requireInternalKeyOrSession({ module: 'projects', permission: 'projects.view' }), controller.retrieve)
  router.patch('/:projectId', requireInternalKey, controller.update)
  router.delete('/:projectId', requireInternalKey, controller.remove)
  router.get('/:projectId/members', requireInternalKey, controller.listMembers)
  router.post('/:projectId/members', requireInternalKey, controller.addMember)
  router.delete(
    '/:projectId/members/:userId',
    requireInternalKey,
    controller.removeMember
  )
  router.get('/:projectId/gantt', requireInternalKey, ganttController.getGantt)
  router.get(
    '/:projectId/baselines',
    requireInternalKey,
    baselinesController.listBaselines
  )
  router.post(
    '/:projectId/baselines',
    requireInternalKey,
    baselinesController.createBaseline
  )
  router.get(
    '/:projectId/baselines/:baselineId/comparison',
    requireInternalKey,
    baselinesController.compareBaseline
  )

  return router
}
