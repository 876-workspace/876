import type { Request, Response } from 'express'
import { z } from 'zod'

import {
  sendProjectsError,
  sendProjectsResult,
} from '../../http/result.js'
import * as service from './webhooks.service.js'
import { webhookDeliveryParamsSchema } from './webhooks.schemas.js'

const replayBodySchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export async function replayDelivery(req: Request, res: Response) {
  const params = webhookDeliveryParamsSchema.parse(req.params)
  const body = replayBodySchema.safeParse(req.body ?? {})
  if (!body.success) return sendProjectsError(res, 'projects/invalid-request')
  return sendProjectsResult(
    res,
    await service.replayDelivery(body.data.organizationId, params.deliveryId)
  )
}
