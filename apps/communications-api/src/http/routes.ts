import { Router } from 'express'

import { buildDeliveryRoutes } from '../modules/deliveries/deliveries.routes.js'
import { buildDomainRoutes } from '../modules/domains/domains.routes.js'
import { buildSenderRoutes } from '../modules/senders/senders.routes.js'
import { buildTemplateRoutes } from '../modules/templates/templates.routes.js'
import { requireInternalKey } from './internal-auth.js'

export function buildRoutes() {
  const router = Router()
  const service = Router()

  service.use(
    '/organizations/:organizationId/email/domains',
    requireInternalKey,
    buildDomainRoutes()
  )
  service.use(
    '/organizations/:organizationId/email/senders',
    requireInternalKey,
    buildSenderRoutes()
  )
  service.use(
    '/organizations/:organizationId/email/templates',
    requireInternalKey,
    buildTemplateRoutes()
  )
  service.use(
    '/organizations/:organizationId/email/deliveries',
    requireInternalKey,
    buildDeliveryRoutes()
  )

  router.use('/v1', service)
  return router
}
