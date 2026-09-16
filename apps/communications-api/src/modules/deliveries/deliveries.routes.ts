import { Router } from 'express'

import { sendError, sendList, sendResult } from '../../http/result.js'
import { createEmailDeliverySchema } from '../../types/communications.js'
import {
  createDelivery,
  listDeliveries,
  retrieveDelivery,
} from './deliveries.service.js'

export function buildDeliveryRoutes() {
  const router = Router({ mergeParams: true })

  router.get('/', async (req, res) => {
    const organizationId = req.params.organizationId
    if (!organizationId) return sendError(res, 'communications/invalid-request')

    const parsedLimit = Number(req.query.limit ?? 50)
    const limit = Number.isSafeInteger(parsedLimit) ? parsedLimit : 50
    return sendList(
      res,
      await listDeliveries(organizationId, limit),
      req.originalUrl
    )
  })

  router.post('/', async (req, res) => {
    const organizationId = req.params.organizationId
    if (!organizationId) return sendError(res, 'communications/invalid-request')

    const parsed = createEmailDeliverySchema.safeParse(req.body)
    if (!parsed.success)
      return sendError(res, 'communications/invalid-request')

    const actorId = req.header('x-actor-id')?.trim() || null
    return sendResult(
      res,
      await createDelivery(organizationId, parsed.data, actorId),
      201
    )
  })

  router.get('/:deliveryId', async (req, res) => {
    const { organizationId, deliveryId } = req.params
    if (!organizationId || !deliveryId)
      return sendError(res, 'communications/invalid-request')

    return sendResult(res, await retrieveDelivery(organizationId, deliveryId))
  })

  return router
}
