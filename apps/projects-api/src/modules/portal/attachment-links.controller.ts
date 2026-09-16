import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import { projectParamsSchema } from './client-grants.schemas.js'
import {
  attachmentParamsSchema,
  attachmentVisibilityBodySchema,
  createAttachmentBodySchema,
  listAttachmentsQuerySchema,
  updateAttachmentBodySchema,
} from './attachment-links.schemas.js'
import * as service from './attachment-links.service.js'

export async function listAttachments(req: Request, res: Response) {
  const params = projectParamsSchema.parse(req.params)
  const query = listAttachmentsQuerySchema.parse(req.query)
  const result = await service.listAttachmentLinks(
    params.organizationId,
    params.projectId,
    query
  )
  return sendProjectsList(
    res,
    result,
    `/v1/organizations/${params.organizationId}/projects/${params.projectId}/attachment-links`
  )
}

export async function createAttachment(req: Request, res: Response) {
  const params = projectParamsSchema.parse(req.params)
  const body = createAttachmentBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.createAttachmentLink(
      params.organizationId,
      params.projectId,
      body
    ),
    201
  )
}

export async function retrieveAttachment(req: Request, res: Response) {
  const params = attachmentParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveAttachmentLink(
      params.organizationId,
      params.projectId,
      params.attachmentId
    )
  )
}

export async function updateAttachment(req: Request, res: Response) {
  const params = attachmentParamsSchema.parse(req.params)
  const body = updateAttachmentBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.updateAttachmentLink(
      params.organizationId,
      params.projectId,
      params.attachmentId,
      body
    )
  )
}

export async function removeAttachment(req: Request, res: Response) {
  const params = attachmentParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removeAttachmentLink(
      params.organizationId,
      params.projectId,
      params.attachmentId
    )
  )
}

export async function setVisibility(req: Request, res: Response) {
  const params = attachmentParamsSchema.parse(req.params)
  const body = attachmentVisibilityBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.setAttachmentVisibility(
      params.organizationId,
      params.projectId,
      params.attachmentId,
      body.clientVisible
    )
  )
}
