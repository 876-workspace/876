import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import {
  createProjectCustomFieldBodySchema,
  organizationParamsSchema,
  projectFieldParamsSchema,
  projectValuesParamsSchema,
  setProjectCustomFieldValuesBodySchema,
  updateProjectCustomFieldBodySchema,
} from './project-custom-fields.schemas.js'
import * as service from './project-custom-fields.service.js'

export async function listCustomFields(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendProjectsList(
    res,
    await service.listCustomFields(organizationId),
    `/v1/organizations/${organizationId}/project-custom-fields`
  )
}

export async function createCustomField(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createCustomField(
      organizationId,
      createProjectCustomFieldBodySchema.parse(req.body)
    ),
    201
  )
}

export async function updateCustomField(req: Request, res: Response) {
  const { organizationId, fieldId } = projectFieldParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateCustomField(
      organizationId,
      fieldId,
      updateProjectCustomFieldBodySchema.parse(req.body)
    )
  )
}

export async function removeCustomField(req: Request, res: Response) {
  const { organizationId, fieldId } = projectFieldParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.deleteCustomField(organizationId, fieldId)
  )
}

export async function listCustomFieldValues(req: Request, res: Response) {
  const { organizationId, projectId } = projectValuesParamsSchema.parse(
    req.params
  )
  return sendProjectsList(
    res,
    await service.listCustomFieldValues(organizationId, projectId),
    `/v1/organizations/${organizationId}/projects/${projectId}/custom-field-values`
  )
}

export async function setCustomFieldValues(req: Request, res: Response) {
  const { organizationId, projectId } = projectValuesParamsSchema.parse(
    req.params
  )
  return sendProjectsList(
    res,
    await service.setCustomFieldValues(
      organizationId,
      projectId,
      setProjectCustomFieldValuesBodySchema.parse(req.body)
    ),
    `/v1/organizations/${organizationId}/projects/${projectId}/custom-field-values`
  )
}
