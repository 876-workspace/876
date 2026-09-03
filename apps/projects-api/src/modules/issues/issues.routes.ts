import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import { createCommentsRouter } from '../comments/comments.routes.js'
import * as controller from './issues.controller.js'

export function createIssuesRouter(): Router {
  const router = Router({ mergeParams: true })

  router.use('/:issueRef/comments', createCommentsRouter())

  router.get('/', requireInternalKey, controller.list)
  router.post('/', requireInternalKey, controller.create)
  router.get('/:issueRef', requireInternalKey, controller.retrieve)
  router.patch('/:issueRef', requireInternalKey, controller.update)
  router.delete('/:issueRef', requireInternalKey, controller.remove)
  router.get('/:issueRef/events', requireInternalKey, controller.listEvents)

  return router
}
