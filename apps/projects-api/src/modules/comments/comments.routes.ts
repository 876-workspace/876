import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import { requireInternalKeyOrSession } from '../../http/session-auth.js'
import * as controller from './comments.controller.js'

export function createCommentsRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternalKeyOrSession({ module: 'issues', permission: 'comments.view' }), controller.list)
  router.post('/', requireInternalKeyOrSession({ module: 'issues', permission: 'comments.create' }), controller.create)
  router.get('/:commentId', requireInternalKeyOrSession({ permission: 'comments.view' }), controller.retrieve)
  router.patch('/:commentId', requireInternalKeyOrSession({ permission: 'comments.edit' }), controller.update)
  router.patch(
    '/:commentId/client-visibility',
    requireInternalKey,
    controller.setVisibility
  )
  router.delete('/:commentId', requireInternalKeyOrSession({ permission: 'comments.delete' }), controller.remove)

  return router
}
