import { Router } from 'express'

import { buildDeliveryRoutes } from '../modules/deliveries/deliveries.routes.js'
import { buildDomainRoutes } from '../modules/domains/domains.routes.js'
import { buildSenderRoutes } from '../modules/senders/senders.routes.js'
import { buildTemplateRoutes } from '../modules/templates/templates.routes.js'
import { requireInternalKey } from './internal-auth.js'

export function buildRoutes() {
  const router = Router()
  const service = Router()

  service.use(requireInternalKey)
  service.use(
    '/organizations/:organizationId/email/domains',
    buildDomainRoutes()
  )
  service.use(
    '/organizations/:organizationId/email/senders',
    buildSenderRoutes()
  )
  service.use(
    '/organizations/:organizationId/email/templates',
    buildTemplateRoutes()
  )
  service.use(
    '/organizations/:organizationId/email/deliveries',
    buildDeliveryRoutes()
  )

  router.use('/v1', service)
  return router
}
