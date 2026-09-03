import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import {
  createIssueBodySchema,
  issueParamsSchema,
  listIssuesQuerySchema,
  organizationParamsSchema,
  updateIssueBodySchema,
} from './issues.schemas.js'
import * as service from './issues.service.js'

export async function list(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = listIssuesQuerySchema.parse(req.query)
  const result = await service.list(params.organizationId, query)
  return sendProjectsList(
    res,
    result,
    `/v1/organizations/${params.organizationId}/issues`
  )
}

export async function create(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const body = createIssueBodySchema.parse(req.body)
  const result = await service.create(params.organizationId, body)
  return sendProjectsResult(res, result, 201)
}

export async function retrieve(req: Request, res: Response) {
  const params = issueParamsSchema.parse(req.params)
  const result = await service.retrieve(params.organizationId, params.issueRef)
  return sendProjectsResult(res, result)
}

export async function update(req: Request, res: Response) {
  const params = issueParamsSchema.parse(req.params)
  const body = updateIssueBodySchema.parse(req.body)
  const result = await service.update(
    params.organizationId,
    params.issueRef,
    body
  )
  return sendProjectsResult(res, result)
}

export async function remove(req: Request, res: Response) {
  const params = issueParamsSchema.parse(req.params)
  const result = await service.remove(params.organizationId, params.issueRef)
  return sendProjectsResult(res, result)
}

export async function listEvents(req: Request, res: Response) {
  const params = issueParamsSchema.parse(req.params)
  const result = await service.listEvents(
    params.organizationId,
    params.issueRef
  )
  return sendProjectsList(
    res,
    result,
    `/v1/organizations/${params.organizationId}/issues/${params.issueRef}/events`
  )
}
