import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './projects.controller.js'

export function createProjectsRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternalKey, controller.list)
  router.post('/', requireInternalKey, controller.create)
  router.get('/:projectId', requireInternalKey, controller.retrieve)
  router.patch('/:projectId', requireInternalKey, controller.update)
  router.delete('/:projectId', requireInternalKey, controller.remove)
  router.get('/:projectId/members', requireInternalKey, controller.listMembers)
  router.post('/:projectId/members', requireInternalKey, controller.addMember)
  router.delete(
    '/:projectId/members/:userId',
    requireInternalKey,
    controller.removeMember
  )

  return router
}
