import { Router } from 'express'
import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './development-links.controller.js'
export function createDevelopmentLinksRouter(): Router {
  const router = Router({ mergeParams: true })
  router.get(
    '/issues/:issueRef/development-links',
    requireInternalKey,
    controller.list
  )
  router.post(
    '/issues/:issueRef/development-links',
    requireInternalKey,
    controller.create
  )
  router.patch('/development-links/:id', requireInternalKey, controller.update)
  router.delete('/development-links/:id', requireInternalKey, controller.remove)
  return router
}
