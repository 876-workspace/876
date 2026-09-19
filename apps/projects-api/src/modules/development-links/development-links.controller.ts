import type { Request, Response } from 'express'
import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import {
  createDevelopmentLinkBodySchema,
  developmentLinkIdParamsSchema,
  issueDevelopmentLinksParamsSchema,
  updateDevelopmentLinkBodySchema,
} from './development-links.schemas.js'
import * as service from './development-links.service.js'

export async function list(req: Request, res: Response) {
  const params = issueDevelopmentLinksParamsSchema.parse(req.params)
  return sendProjectsList(
    res,
    await service.list(params.organizationId, params.issueRef),
    `/v1/organizations/${params.organizationId}/issues/${params.issueRef}/development-links`
  )
}
export async function create(req: Request, res: Response) {
  const params = issueDevelopmentLinksParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.create(
      params.organizationId,
      params.issueRef,
      createDevelopmentLinkBodySchema.parse(req.body)
    ),
    201
  )
}
export async function update(req: Request, res: Response) {
  const params = developmentLinkIdParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.update(
      params.organizationId,
      params.id,
      updateDevelopmentLinkBodySchema.parse(req.body)
    )
  )
}
export async function remove(req: Request, res: Response) {
  const params = developmentLinkIdParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.remove(params.organizationId, params.id)
  )
}
