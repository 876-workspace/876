import { Router } from 'express'
import { requireInternal } from '../../http/internal-auth.js'
import * as c from './categories.controller.js'
export function createCategoriesRouter() {
  const r = Router({ mergeParams: true })
  r.get('/', requireInternal, c.all)
  r.post('/', requireInternal, c.create)
  r.get('/:id', requireInternal, c.get)
  r.patch('/:id', requireInternal, c.update)
  r.delete('/:id', requireInternal, c.remove)
  r.post('/:id/subcategories', requireInternal, c.addSub)
  r.patch('/:id/subcategories/:subcategoryId', requireInternal, c.patchSub)
  r.delete('/:id/subcategories/:subcategoryId', requireInternal, c.deleteSub)
  return r
}
