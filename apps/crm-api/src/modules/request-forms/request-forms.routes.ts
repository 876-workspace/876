import { Router } from 'express'

import { requireInternalOrServiceApp } from '../../http/service-auth.js'
import * as controller from './request-forms.controller.js'

export function createRequestFormsRouter() {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternalOrServiceApp, controller.listRequestForms)
  router.post('/', requireInternalOrServiceApp, controller.createRequestForm)
  router.get('/:id', requireInternalOrServiceApp, controller.retrieveRequestForm)
  router.patch('/:id', requireInternalOrServiceApp, controller.updateRequestForm)
  router.delete('/:id', requireInternalOrServiceApp, controller.deleteRequestForm)
  router.post('/:id/submissions', requireInternalOrServiceApp, controller.submitRequestForm)
  router.get(
    '/:id/submissions',
    requireInternalOrServiceApp,
    controller.listRequestFormSubmissions
  )
  router.get(
    '/:id/requests',
    requireInternalOrServiceApp,
    controller.listFormCustomerRequests
  )

  return router
}
