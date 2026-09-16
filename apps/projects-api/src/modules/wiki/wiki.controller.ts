import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import {
  createPageBodySchema,
  listPagesQuerySchema,
  pageParamsSchema,
  projectParamsSchema,
  restoreRevisionBodySchema,
  revisionParamsSchema,
  updatePageBodySchema,
} from './wiki.schemas.js'
import * as service from './wiki.service.js'

const revisionsQuerySchema = listPagesQuerySchema.pick({
  limit: true,
  starting_after: true,
})

export async function listPages(req: Request, res: Response) {
  const params = projectParamsSchema.parse(req.params)
  const query = listPagesQuerySchema.parse(req.query)
  const result = await service.listPages(
    params.organizationId,
    params.projectId,
    query
  )
  return sendProjectsList(
    res,
    result,
    `/v1/organizations/${params.organizationId}/projects/${params.projectId}/wiki`
  )
}

export async function createPage(req: Request, res: Response) {
  const params = projectParamsSchema.parse(req.params)
  const body = createPageBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.createPage(params.organizationId, params.projectId, body),
    201
  )
}

export async function retrievePage(req: Request, res: Response) {
  const params = pageParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrievePage(
      params.organizationId,
      params.projectId,
      params.pageRef
    )
  )
}

export async function updatePage(req: Request, res: Response) {
  const params = pageParamsSchema.parse(req.params)
  const body = updatePageBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.updatePage(
      params.organizationId,
      params.projectId,
      params.pageRef,
      body
    )
  )
}

export async function removePage(req: Request, res: Response) {
  const params = pageParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removePage(
      params.organizationId,
      params.projectId,
      params.pageRef
    )
  )
}

export async function listRevisions(req: Request, res: Response) {
  const params = pageParamsSchema.parse(req.params)
  const query = revisionsQuerySchema.parse(req.query)
  const result = await service.listRevisions(
    params.organizationId,
    params.projectId,
    params.pageRef,
    query
  )
  return sendProjectsList(
    res,
    result,
    `/v1/organizations/${params.organizationId}/projects/${params.projectId}/wiki/${params.pageRef}/revisions`
  )
}

export async function retrieveRevision(req: Request, res: Response) {
  const params = revisionParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveRevision(
      params.organizationId,
      params.projectId,
      params.pageRef,
      params.revisionId
    )
  )
}

export async function restoreRevision(req: Request, res: Response) {
  const params = pageParamsSchema.parse(req.params)
  const body = restoreRevisionBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.restoreRevision(
      params.organizationId,
      params.projectId,
      params.pageRef,
      body.revisionId,
      body.authorUserId ?? null
    )
  )
}
