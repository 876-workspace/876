import { Router } from 'express'

import * as controller from './customers.controller.js'

export function createCustomersRouter() {
  const router = Router({ mergeParams: true })

  router.get('/', controller.listCustomers)
  router.post('/', controller.createCustomer)
  router.get('/:id', controller.retrieveCustomer)
  router.patch('/:id', controller.updateCustomer)
  router.delete('/:id', controller.deleteCustomer)

  return router
}
