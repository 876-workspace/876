import type { Request, Response } from 'express'

import { sendWorkResult } from '../../http/result.js'
import * as service from './resource-work.service.js'
import {
  resourceWorkParamsSchema,
  resourceWorkQuerySchema,
} from './resource-work.schemas.js'

export async function retrieveResourceWork(req: Request, res: Response) {
  const { organizationId } = resourceWorkParamsSchema.parse(req.params)
  const query = resourceWorkQuerySchema.parse(req.query)

  return sendWorkResult(
    res,
    await service.retrieve(
      organizationId,
      {
        service: query.context_service,
        resource: query.context_resource,
        id: query.context_id,
      },
      query.from,
      query.to
    )
  )
}
