import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import {
  commentParamsSchema,
  commentVisibilityBodySchema,
  createCommentBodySchema,
  issueParamsSchema,
  listCommentsQuerySchema,
  updateCommentBodySchema,
} from './comments.schemas.js'
import * as service from './comments.service.js'

export async function list(req: Request, res: Response) {
  const params = issueParamsSchema.parse(req.params)
  const query = listCommentsQuerySchema.parse(req.query)
  const result = await service.list(
    params.organizationId,
    params.issueRef,
    query
  )
  return sendProjectsList(
    res,
    result,
    `/v1/organizations/${params.organizationId}/issues/${params.issueRef}/comments`
  )
}

export async function retrieve(req: Request, res: Response) {
  const params = commentParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieve(
      params.organizationId,
      params.issueRef,
      params.commentId
    )
  )
}

export async function create(req: Request, res: Response) {
  const params = issueParamsSchema.parse(req.params)
  const body = createCommentBodySchema.parse(req.body)
  const result = await service.create(
    params.organizationId,
    params.issueRef,
    body
  )
  return sendProjectsResult(res, result, 201)
}

export async function update(req: Request, res: Response) {
  const params = commentParamsSchema.parse(req.params)
  const body = updateCommentBodySchema.parse(req.body)
  const result = await service.update(
    params.organizationId,
    params.issueRef,
    params.commentId,
    body
  )
  return sendProjectsResult(res, result)
}

export async function remove(req: Request, res: Response) {
  const params = commentParamsSchema.parse(req.params)
  const result = await service.remove(
    params.organizationId,
    params.issueRef,
    params.commentId
  )
  return sendProjectsResult(res, result)
}

export async function setVisibility(req: Request, res: Response) {
  const params = commentParamsSchema.parse(req.params)
  const body = commentVisibilityBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.setCommentVisibility(
      params.organizationId,
      params.issueRef,
      params.commentId,
      body.clientVisible
    )
  )
}
