import { Router } from 'express'

import {
  requireInternalOrServiceApp,
} from '../../http/service-auth.js'
import * as controller from './customers.controller.js'

export function createCustomersRouter() {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternalOrServiceApp, controller.listCustomers)
  router.post('/', requireInternalOrServiceApp, controller.createCustomer)
  router.get('/:id', requireInternalOrServiceApp, controller.retrieveCustomer)
  router.patch('/:id', requireInternalOrServiceApp, controller.updateCustomer)
  router.delete('/:id', requireInternalOrServiceApp, controller.deleteCustomer)

  return router
}
