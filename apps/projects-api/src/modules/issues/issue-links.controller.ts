import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import {
  createIssueDependencyBodySchema,
  createIssueRelationBodySchema,
  issueLinkIdParamsSchema,
  issueLinkParamsSchema,
  scheduleSuggestionBodySchema,
  updateIssueDependencyBodySchema,
} from './issue-links.schemas.js'
import * as service from './issue-links.service.js'

export async function listRelations(req: Request, res: Response) {
  const params = issueLinkParamsSchema.parse(req.params)
  return sendProjectsList(
    res,
    await service.listRelations(params.organizationId, params.issueRef),
    `/v1/organizations/${params.organizationId}/issues/${params.issueRef}/relations`
  )
}

export async function createRelation(req: Request, res: Response) {
  const params = issueLinkParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createRelation(
      params.organizationId,
      params.issueRef,
      createIssueRelationBodySchema.parse(req.body)
    ),
    201
  )
}

export async function removeRelation(req: Request, res: Response) {
  const params = issueLinkIdParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removeRelation(
      params.organizationId,
      params.issueRef,
      params.id
    )
  )
}

export async function listDependencies(req: Request, res: Response) {
  const params = issueLinkParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.listDependencies(params.organizationId, params.issueRef)
  )
}

export async function createDependency(req: Request, res: Response) {
  const params = issueLinkParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createDependency(
      params.organizationId,
      params.issueRef,
      createIssueDependencyBodySchema.parse(req.body)
    ),
    201
  )
}

export async function updateDependency(req: Request, res: Response) {
  const params = issueLinkIdParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateDependency(
      params.organizationId,
      params.issueRef,
      params.id,
      updateIssueDependencyBodySchema.parse(req.body)
    )
  )
}

export async function removeDependency(req: Request, res: Response) {
  const params = issueLinkIdParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removeDependency(
      params.organizationId,
      params.issueRef,
      params.id
    )
  )
}

export async function suggestSchedule(req: Request, res: Response) {
  const params = issueLinkParamsSchema.parse(req.params)
  scheduleSuggestionBodySchema.parse(req.body ?? {})
  return sendProjectsResult(
    res,
    await service.suggestSchedule(params.organizationId, params.issueRef)
  )
}
