import { Router } from 'express'

import { requireInternal } from '../../http/internal-auth.js'
import { requireInternalOrServiceApp } from '../../http/service-auth.js'
import { createEventsRouter } from '../events/index.js'
import { createNotesRouter } from '../notes/index.js'
import { createRemindersRouter } from '../reminders/index.js'
import { createTasksRouter } from '../tasks/index.js'
import * as controller from './requests.controller.js'

export function createRequestsRouter() {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternalOrServiceApp, controller.listRequests)
  router.post('/', requireInternalOrServiceApp, controller.createRequest)
  router.get('/:id', requireInternalOrServiceApp, controller.retrieveRequest)
  router.patch('/:id', requireInternalOrServiceApp, controller.updateRequest)
  router.delete('/:id', requireInternalOrServiceApp, controller.deleteRequest)

  router.use('/:id/notes', createNotesRouter())
  router.use('/:id/tasks', createTasksRouter())
  router.use('/:id/reminders', createRemindersRouter())
  router.use('/:id/events', createEventsRouter())

  return router
}

export function createBillingCustomerRequestsRouter() {
  const router = Router({ mergeParams: true })
  router.get(
    '/',
    requireInternalOrServiceApp,
    controller.listRequestsForBillingCustomer
  )
  router.post(
    '/',
    requireInternalOrServiceApp,
    controller.createRequestForBillingCustomer
  )
  return router
}

export function createOperatorRequestsRouter() {
  const router = Router()
  router.get('/', requireInternal, controller.listAcrossOrganizationsRequests)
  return router
}
