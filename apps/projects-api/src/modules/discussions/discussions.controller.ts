import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import {
  createDiscussionBodySchema,
  createPostBodySchema,
  discussionParamsSchema,
  listDiscussionsQuerySchema,
  listPostsQuerySchema,
  postParamsSchema,
  projectParamsSchema,
  updateDiscussionBodySchema,
  updatePostBodySchema,
  visibilityBodySchema,
} from './discussions.schemas.js'
import * as service from './discussions.service.js'

export async function listDiscussions(req: Request, res: Response) {
  const params = projectParamsSchema.parse(req.params)
  const query = listDiscussionsQuerySchema.parse(req.query)
  const result = await service.listDiscussions(
    params.organizationId,
    params.projectId,
    query
  )
  return sendProjectsList(
    res,
    result,
    `/v1/organizations/${params.organizationId}/projects/${params.projectId}/discussions`
  )
}

export async function createDiscussion(req: Request, res: Response) {
  const params = projectParamsSchema.parse(req.params)
  const body = createDiscussionBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.createDiscussion(
      params.organizationId,
      params.projectId,
      body
    ),
    201
  )
}

export async function retrieveDiscussion(req: Request, res: Response) {
  const params = discussionParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveDiscussion(
      params.organizationId,
      params.projectId,
      params.discussionId
    )
  )
}

export async function updateDiscussion(req: Request, res: Response) {
  const params = discussionParamsSchema.parse(req.params)
  const body = updateDiscussionBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.updateDiscussion(
      params.organizationId,
      params.projectId,
      params.discussionId,
      body
    )
  )
}

export async function removeDiscussion(req: Request, res: Response) {
  const params = discussionParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removeDiscussion(
      params.organizationId,
      params.projectId,
      params.discussionId
    )
  )
}

export async function setVisibility(req: Request, res: Response) {
  const params = discussionParamsSchema.parse(req.params)
  const body = visibilityBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.setDiscussionVisibility(
      params.organizationId,
      params.projectId,
      params.discussionId,
      body.clientVisible
    )
  )
}

export async function listPosts(req: Request, res: Response) {
  const params = discussionParamsSchema.parse(req.params)
  const query = listPostsQuerySchema.parse(req.query)
  const result = await service.listPosts(
    params.organizationId,
    params.projectId,
    params.discussionId,
    query
  )
  return sendProjectsList(
    res,
    result,
    `/v1/organizations/${params.organizationId}/projects/${params.projectId}/discussions/${params.discussionId}/posts`
  )
}

export async function createPost(req: Request, res: Response) {
  const params = discussionParamsSchema.parse(req.params)
  const body = createPostBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.createPost(
      params.organizationId,
      params.projectId,
      params.discussionId,
      body
    ),
    201
  )
}

export async function updatePost(req: Request, res: Response) {
  const params = postParamsSchema.parse(req.params)
  const body = updatePostBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.updatePost(
      params.organizationId,
      params.projectId,
      params.discussionId,
      params.postId,
      body
    )
  )
}

export async function removePost(req: Request, res: Response) {
  const params = postParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removePost(
      params.organizationId,
      params.projectId,
      params.discussionId,
      params.postId
    )
  )
}
