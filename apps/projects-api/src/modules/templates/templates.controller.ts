import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import * as service from './templates.service.js'
import {
  cloneProjectBodySchema,
  createTemplateBodySchema,
  instantiateTemplateBodySchema,
  organizationParamsSchema,
  previewTemplateBodySchema,
  saveAsTemplateBodySchema,
  templateParamsSchema,
  templateProjectParamsSchema,
  updateTemplateBodySchema,
} from './templates.schemas.js'

export async function list(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const result = await service.listTemplates(params.organizationId)
  return sendProjectsList(
    res,
    result,
    `/v1/organizations/${params.organizationId}/project-templates`,
  )
}

export async function create(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const body = createTemplateBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.createTemplate(params.organizationId, body),
    201,
  )
}

export async function retrieve(req: Request, res: Response) {
  const params = templateParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveTemplate(params.organizationId, params.templateId),
  )
}

export async function update(req: Request, res: Response) {
  const params = templateParamsSchema.parse(req.params)
  const body = updateTemplateBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.updateTemplate(params.organizationId, params.templateId, body),
  )
}

export async function remove(req: Request, res: Response) {
  const params = templateParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removeTemplate(params.organizationId, params.templateId),
  )
}

export async function listVersions(req: Request, res: Response) {
  const params = templateParamsSchema.parse(req.params)
  const result = await service.listTemplateVersions(
    params.organizationId,
    params.templateId,
  )
  return sendProjectsList(
    res,
    result,
    `/v1/organizations/${params.organizationId}/project-templates/${params.templateId}/versions`,
  )
}

export async function saveAsTemplate(req: Request, res: Response) {
  const params = templateProjectParamsSchema.parse(req.params)
  const body = saveAsTemplateBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.saveAsTemplate(params.organizationId, params.projectId, body),
    201,
  )
}

export async function preview(req: Request, res: Response) {
  const params = templateParamsSchema.parse(req.params)
  const body = previewTemplateBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.previewTemplate(params.organizationId, params.templateId, body),
  )
}

export async function instantiate(req: Request, res: Response) {
  const params = templateParamsSchema.parse(req.params)
  const body = instantiateTemplateBodySchema.parse(req.body)
  const result = await service.instantiateTemplate(
    params.organizationId,
    params.templateId,
    body,
  )
  if (result.error !== null || result.data === null) {
    return sendProjectsResult(res, result)
  }
  return sendProjectsResult(
    res,
    { data: result.data.project, error: null },
    result.data.replayed ? 200 : 201,
  )
}

export async function clone(req: Request, res: Response) {
  const params = templateProjectParamsSchema.parse(req.params)
  const body = cloneProjectBodySchema.parse(req.body)
  const result = await service.cloneProject(
    params.organizationId,
    params.projectId,
    body,
  )
  if (result.error !== null || result.data === null) {
    return sendProjectsResult(res, result)
  }
  return sendProjectsResult(
    res,
    { data: result.data.project, error: null },
    201,
  )
}
