import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import {
  addMemberBodySchema,
  createProjectBodySchema,
  listProjectsQuerySchema,
  memberParamsSchema,
  organizationParamsSchema,
  projectParamsSchema,
  updateProjectBodySchema,
} from './projects.schemas.js'
import * as service from './projects.service.js'

export async function list(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = listProjectsQuerySchema.parse(req.query)
  const result = await service.list(params.organizationId, query)
  return sendProjectsList(
    res,
    result,
    `/v1/organizations/${params.organizationId}/projects`
  )
}

export async function create(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const body = createProjectBodySchema.parse(req.body)
  const result = await service.create(params.organizationId, body)
  return sendProjectsResult(res, result, 201)
}

export async function retrieve(req: Request, res: Response) {
  const params = projectParamsSchema.parse(req.params)
  const result = await service.retrieve(params.organizationId, params.projectId)
  return sendProjectsResult(res, result)
}

export async function update(req: Request, res: Response) {
  const params = projectParamsSchema.parse(req.params)
  const body = updateProjectBodySchema.parse(req.body)
  const result = await service.update(
    params.organizationId,
    params.projectId,
    body
  )
  return sendProjectsResult(res, result)
}

export async function remove(req: Request, res: Response) {
  const params = projectParamsSchema.parse(req.params)
  const result = await service.remove(params.organizationId, params.projectId)
  return sendProjectsResult(res, result)
}

export async function listMembers(req: Request, res: Response) {
  const params = projectParamsSchema.parse(req.params)
  const result = await service.listMembers(
    params.organizationId,
    params.projectId
  )
  return sendProjectsList(
    res,
    result,
    `/v1/organizations/${params.organizationId}/projects/${params.projectId}/members`
  )
}

export async function addMember(req: Request, res: Response) {
  const params = projectParamsSchema.parse(req.params)
  const body = addMemberBodySchema.parse(req.body)
  const result = await service.addMember(
    params.organizationId,
    params.projectId,
    body
  )
  return sendProjectsResult(res, result, 201)
}

export async function removeMember(req: Request, res: Response) {
  const params = memberParamsSchema.parse(req.params)
  const result = await service.removeMember(
    params.organizationId,
    params.projectId,
    params.userId
  )
  return sendProjectsResult(res, result)
}
