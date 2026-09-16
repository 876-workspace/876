import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './templates.controller.js'

export function createTemplatesRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get('/project-templates', requireInternalKey, controller.list)
  router.post('/project-templates', requireInternalKey, controller.create)
  router.get(
    '/project-templates/:templateId',
    requireInternalKey,
    controller.retrieve,
  )
  router.patch(
    '/project-templates/:templateId',
    requireInternalKey,
    controller.update,
  )
  router.delete(
    '/project-templates/:templateId',
    requireInternalKey,
    controller.remove,
  )
  router.get(
    '/project-templates/:templateId/versions',
    requireInternalKey,
    controller.listVersions,
  )
  router.post(
    '/project-templates/:templateId/preview',
    requireInternalKey,
    controller.preview,
  )
  router.post(
    '/project-templates/:templateId/instantiate',
    requireInternalKey,
    controller.instantiate,
  )
  router.post(
    '/projects/:projectId/save-as-template',
    requireInternalKey,
    controller.saveAsTemplate,
  )
  router.post(
    '/projects/:projectId/clone',
    requireInternalKey,
    controller.clone,
  )

  return router
}
