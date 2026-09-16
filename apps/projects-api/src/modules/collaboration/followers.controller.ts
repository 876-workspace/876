import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import {
  followBodySchema,
  listFollowersQuerySchema,
  organizationParamsSchema,
  unfollowQuerySchema,
} from './followers.schemas.js'
import * as service from './followers.service.js'

export async function follow(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const body = followBodySchema.parse(req.body)
  const result = await service.follow(params.organizationId, body)
  return sendProjectsResult(res, result, 201)
}

export async function unfollow(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = unfollowQuerySchema.parse(req.query)
  const result = await service.unfollow(
    params.organizationId,
    query.subjectType,
    query.subjectId,
    query.userId
  )
  return sendProjectsResult(res, result)
}

export async function list(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = listFollowersQuerySchema.parse(req.query)
  const result = await service.list(params.organizationId, query)
  return sendProjectsList(
    res,
    result,
    `/v1/organizations/${params.organizationId}/followers`
  )
}
