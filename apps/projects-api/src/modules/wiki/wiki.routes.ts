import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './wiki.controller.js'

export function createWikiRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternalKey, controller.listPages)
  router.post('/', requireInternalKey, controller.createPage)
  router.get('/:pageRef', requireInternalKey, controller.retrievePage)
  router.patch('/:pageRef', requireInternalKey, controller.updatePage)
  router.delete('/:pageRef', requireInternalKey, controller.removePage)
  router.get(
    '/:pageRef/revisions',
    requireInternalKey,
    controller.listRevisions
  )
  router.get(
    '/:pageRef/revisions/:revisionId',
    requireInternalKey,
    controller.retrieveRevision
  )
  router.post(
    '/:pageRef/restore',
    requireInternalKey,
    controller.restoreRevision
  )

  return router
}
