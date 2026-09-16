import type { Request, Response } from 'express'

import { sendProjectsResult } from '../../http/result.js'
import * as service from './gantt.service.js'
import { ganttParamsSchema, parseGanttQuery } from './gantt.schemas.js'

export async function getGantt(req: Request, res: Response) {
  const params = ganttParamsSchema.parse(req.params)
  const query = parseGanttQuery({
    zoom: req.query.zoom,
    includeSubItems: req.query.includeSubItems,
  })
  return sendProjectsResult(
    res,
    await service.getGantt(params.organizationId, params.projectId, query)
  )
}
