import { Router } from 'express'

import { requireInternal } from '../../http/internal-auth.js'
import * as controller from './request-forms.controller.js'

export function createRequestFormsRouter() {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternal, controller.listRequestForms)
  router.post('/', requireInternal, controller.createRequestForm)
  router.get('/:id', requireInternal, controller.retrieveRequestForm)
  router.patch('/:id', requireInternal, controller.updateRequestForm)
  router.delete('/:id', requireInternal, controller.deleteRequestForm)
  router.post('/:id/submissions', requireInternal, controller.submitRequestForm)
  router.get(
    '/:id/submissions',
    requireInternal,
    controller.listRequestFormSubmissions
  )
  router.get(
    '/:id/requests',
    requireInternal,
    controller.listFormCustomerRequests
  )

  return router
}
