import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './client-grants.controller.js'

export function createClientGrantsRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternalKey, controller.listGrants)
  router.post('/', requireInternalKey, controller.inviteGrant)
  router.get('/:grantId', requireInternalKey, controller.retrieveGrant)
  router.patch('/:grantId', requireInternalKey, controller.updateGrant)
  router.post('/:grantId/revoke', requireInternalKey, controller.revokeGrant)

  return router
}
