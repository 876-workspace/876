import type { Request, Response } from 'express'

import { sendProjectsError } from '../../http/result.js'
import {
  exportTimeEntriesQuerySchema,
  exportWorkItemsQuerySchema,
} from './exports.schemas.js'
import * as service from './exports.service.js'

function organizationId(req: Request): string {
  return String(req.params.organizationId ?? '')
}

export async function exportWorkItems(req: Request, res: Response) {
  const query = exportWorkItemsQuerySchema.parse(req.query)
  const result = await service.buildWorkItemsCsv(organizationId(req), query)
  if ('error' in result)
    return sendProjectsError(res, result.error.code)
  return res.status(200).type('text/csv').send(result.csv)
}

export async function exportTimeEntries(req: Request, res: Response) {
  const query = exportTimeEntriesQuerySchema.parse(req.query)
  const result = await service.buildTimeEntriesCsv(organizationId(req), query)
  if ('error' in result)
    return sendProjectsError(res, result.error.code)
  return res.status(200).type('text/csv').send(result.csv)
}
