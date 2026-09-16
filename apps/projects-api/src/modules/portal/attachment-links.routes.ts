import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './attachment-links.controller.js'

export function createAttachmentLinksRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternalKey, controller.listAttachments)
  router.post('/', requireInternalKey, controller.createAttachment)
  router.get('/:attachmentId', requireInternalKey, controller.retrieveAttachment)
  router.patch(
    '/:attachmentId',
    requireInternalKey,
    controller.updateAttachment
  )
  router.delete(
    '/:attachmentId',
    requireInternalKey,
    controller.removeAttachment
  )
  router.patch(
    '/:attachmentId/client-visibility',
    requireInternalKey,
    controller.setVisibility
  )

  return router
}
