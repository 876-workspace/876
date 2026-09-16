import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import {
  grantParamsSchema,
  inviteGrantBodySchema,
  listGrantsQuerySchema,
  projectParamsSchema,
  updateGrantBodySchema,
} from './client-grants.schemas.js'
import * as service from './client-grants.service.js'

export async function listGrants(req: Request, res: Response) {
  const params = projectParamsSchema.parse(req.params)
  const query = listGrantsQuerySchema.parse(req.query)
  const result = await service.listGrants(
    params.organizationId,
    params.projectId,
    query
  )
  return sendProjectsList(
    res,
    result,
    `/v1/organizations/${params.organizationId}/projects/${params.projectId}/client-grants`
  )
}

export async function inviteGrant(req: Request, res: Response) {
  const params = projectParamsSchema.parse(req.params)
  const body = inviteGrantBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.inviteGrant(params.organizationId, params.projectId, body),
    201
  )
}

export async function retrieveGrant(req: Request, res: Response) {
  const params = grantParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveGrant(
      params.organizationId,
      params.projectId,
      params.grantId
    )
  )
}

export async function updateGrant(req: Request, res: Response) {
  const params = grantParamsSchema.parse(req.params)
  const body = updateGrantBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.updateGrant(
      params.organizationId,
      params.projectId,
      params.grantId,
      body
    )
  )
}

export async function revokeGrant(req: Request, res: Response) {
  const params = grantParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.revokeGrant(
      params.organizationId,
      params.projectId,
      params.grantId
    )
  )
}
