import type { Request, Response } from 'express'

import { sendProjectsResult } from '../../http/result.js'
import {
  activityQuerySchema,
  projectParamsSchema,
} from './activity.schemas.js'
import * as service from './activity.service.js'

export async function listProjectActivity(req: Request, res: Response) {
  const params = projectParamsSchema.parse(req.params)
  const query = activityQuerySchema.parse(req.query)
  return sendProjectsResult(
    res,
    await service.listProjectActivity(
      params.organizationId,
      params.projectId,
      query
    )
  )
}
