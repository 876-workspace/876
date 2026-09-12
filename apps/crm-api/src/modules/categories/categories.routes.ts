import { Router } from 'express'
import { requireInternalOrServiceApp } from '../../http/service-auth.js'
import * as c from './categories.controller.js'
export function createCategoriesRouter() {
  const r = Router({ mergeParams: true })
  r.get('/', requireInternalOrServiceApp, c.all)
  r.post('/', requireInternalOrServiceApp, c.create)
  r.get('/:id', requireInternalOrServiceApp, c.get)
  r.patch('/:id', requireInternalOrServiceApp, c.update)
  r.delete('/:id', requireInternalOrServiceApp, c.remove)
  r.post('/:id/subcategories', requireInternalOrServiceApp, c.addSub)
  r.patch('/:id/subcategories/:subcategoryId', requireInternalOrServiceApp, c.patchSub)
  r.delete('/:id/subcategories/:subcategoryId', requireInternalOrServiceApp, c.deleteSub)
  return r
}
