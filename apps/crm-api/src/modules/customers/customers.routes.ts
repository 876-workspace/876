import { Router } from 'express'

import { requireInternal } from '../../http/internal-auth.js'
import * as controller from './customers.controller.js'

export function createCustomersRouter() {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternal, controller.listCustomers)
  router.post('/', requireInternal, controller.createCustomer)
  router.get('/:id', requireInternal, controller.retrieveCustomer)
  router.patch('/:id', requireInternal, controller.updateCustomer)
  router.delete('/:id', requireInternal, controller.deleteCustomer)

  return router
}
