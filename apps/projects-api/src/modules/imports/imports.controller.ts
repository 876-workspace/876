import type { Request, Response } from 'express'

import { sendProjectsResult } from '../../http/result.js'
import * as service from './imports.service.js'
import {
  createImportJobBodySchema,
  importJobParamsSchema,
  listImportJobsQuerySchema,
} from './imports.schemas.js'

function organizationId(req: Request): string {
  return String(req.params.organizationId ?? '')
}

export async function createJob(req: Request, res: Response) {
  const body = createImportJobBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.createJob(organizationId(req), body),
    201
  )
}

export async function listJobs(req: Request, res: Response) {
  const query = listImportJobsQuerySchema.parse(req.query)
  const result = await service.listJobs(organizationId(req), query)
  if (result.error !== null) return sendProjectsResult(res, result)
  return res.json({
    data: {
      object: 'list',
      data: result.data,
      has_more: false,
      total_count: result.data.length,
      url: `/v1/organizations/${organizationId(req)}/import-jobs`,
    },
    error: null,
  })
}

export async function retrieveJob(req: Request, res: Response) {
  const params = importJobParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveJob(organizationId(req), params.id)
  )
}

export async function listJobRows(req: Request, res: Response) {
  const params = importJobParamsSchema.parse(req.params)
  const result = await service.listJobRows(organizationId(req), params.id)
  if (result.error !== null) return sendProjectsResult(res, result)
  return res.json({
    data: {
      object: 'list',
      data: result.data,
      has_more: false,
      total_count: result.data.length,
      url: `/v1/organizations/${organizationId(req)}/import-jobs/${params.id}/rows`,
    },
    error: null,
  })
}

export async function commitJob(req: Request, res: Response) {
  const params = importJobParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.commitJob(organizationId(req), params.id)
  )
}
