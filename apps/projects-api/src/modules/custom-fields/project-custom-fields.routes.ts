import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './project-custom-fields.controller.js'

export function createProjectCustomFieldsRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get('/project-custom-fields', requireInternalKey, controller.listCustomFields)
  router.post(
    '/project-custom-fields',
    requireInternalKey,
    controller.createCustomField
  )
  router.patch(
    '/project-custom-fields/:fieldId',
    requireInternalKey,
    controller.updateCustomField
  )
  router.delete(
    '/project-custom-fields/:fieldId',
    requireInternalKey,
    controller.removeCustomField
  )

  return router
}

export function createProjectCustomFieldValuesRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get(
    '/:projectId/custom-field-values',
    requireInternalKey,
    controller.listCustomFieldValues
  )
  router.put(
    '/:projectId/custom-field-values',
    requireInternalKey,
    controller.setCustomFieldValues
  )

  return router
}
