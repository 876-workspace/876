import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import {
  applyPresetBodySchema,
  createCustomFieldBodySchema,
  createMilestoneBodySchema,
  createWorkItemTypeBodySchema,
  createWorkflowStateBodySchema,
  customFieldValueParamsSchema,
  issueParamsSchema,
  milestoneListQuerySchema,
  organizationParamsSchema,
  resourceParamsSchema,
  setCustomFieldValueBodySchema,
  updateCustomFieldBodySchema,
  updateMilestoneBodySchema,
  updateWorkItemTypeBodySchema,
  updateWorkflowStateBodySchema,
} from './work-structure.schemas.js'
import * as service from './work-structure.service.js'

export async function listWorkItemTypes(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendProjectsList(
    res,
    await service.listWorkItemTypes(organizationId),
    `/v1/organizations/${organizationId}/work-item-types`
  )
}
export async function createWorkItemType(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createWorkItemType(
      organizationId,
      createWorkItemTypeBodySchema.parse(req.body)
    ),
    201
  )
}
export async function retrieveWorkItemType(req: Request, res: Response) {
  const { organizationId, id } = resourceParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveWorkItemType(organizationId, id)
  )
}
export async function updateWorkItemType(req: Request, res: Response) {
  const { organizationId, id } = resourceParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateWorkItemType(
      organizationId,
      id,
      updateWorkItemTypeBodySchema.parse(req.body)
    )
  )
}
export async function removeWorkItemType(req: Request, res: Response) {
  const { organizationId, id } = resourceParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removeWorkItemType(organizationId, id)
  )
}

export async function listWorkflowStates(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendProjectsList(
    res,
    await service.listWorkflowStates(organizationId),
    `/v1/organizations/${organizationId}/workflow-states`
  )
}
export async function createWorkflowState(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createWorkflowState(
      organizationId,
      createWorkflowStateBodySchema.parse(req.body)
    ),
    201
  )
}
export async function retrieveWorkflowState(req: Request, res: Response) {
  const { organizationId, id } = resourceParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveWorkflowState(organizationId, id)
  )
}
export async function updateWorkflowState(req: Request, res: Response) {
  const { organizationId, id } = resourceParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateWorkflowState(
      organizationId,
      id,
      updateWorkflowStateBodySchema.parse(req.body)
    )
  )
}
export async function removeWorkflowState(req: Request, res: Response) {
  const { organizationId, id } = resourceParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removeWorkflowState(organizationId, id)
  )
}

export async function listMilestones(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const query = milestoneListQuerySchema.parse(req.query)
  return sendProjectsList(
    res,
    await service.listMilestones(organizationId, query.projectId, query.status),
    `/v1/organizations/${organizationId}/milestones`
  )
}
export async function createMilestone(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createMilestone(
      organizationId,
      createMilestoneBodySchema.parse(req.body)
    ),
    201
  )
}
export async function retrieveMilestone(req: Request, res: Response) {
  const { organizationId, id } = resourceParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveMilestone(organizationId, id)
  )
}
export async function updateMilestone(req: Request, res: Response) {
  const { organizationId, id } = resourceParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateMilestone(
      organizationId,
      id,
      updateMilestoneBodySchema.parse(req.body)
    )
  )
}
export async function removeMilestone(req: Request, res: Response) {
  const { organizationId, id } = resourceParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removeMilestone(organizationId, id)
  )
}

export async function listCustomFields(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendProjectsList(
    res,
    await service.listCustomFields(organizationId),
    `/v1/organizations/${organizationId}/custom-fields`
  )
}
export async function createCustomField(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createCustomField(
      organizationId,
      createCustomFieldBodySchema.parse(req.body)
    ),
    201
  )
}
export async function retrieveCustomField(req: Request, res: Response) {
  const { organizationId, id } = resourceParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveCustomField(organizationId, id)
  )
}
export async function updateCustomField(req: Request, res: Response) {
  const { organizationId, id } = resourceParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateCustomField(
      organizationId,
      id,
      updateCustomFieldBodySchema.parse(req.body)
    )
  )
}
export async function removeCustomField(req: Request, res: Response) {
  const { organizationId, id } = resourceParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removeCustomField(organizationId, id)
  )
}

export async function listPresets(_req: Request, res: Response) {
  return sendProjectsResult(res, { data: service.listPresets(), error: null })
}
export async function applyPreset(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const { key } = applyPresetBodySchema.parse(req.body)
  return sendProjectsResult(res, await service.applyPreset(organizationId, key))
}
export async function listCustomFieldValues(req: Request, res: Response) {
  const { organizationId, issueRef } = issueParamsSchema.parse(req.params)
  const issue = await service.resolveIssueForCustomFields(
    organizationId,
    issueRef
  )
  return sendProjectsList(
    res,
    issue,
    `/v1/organizations/${organizationId}/issues/${issueRef}/custom-field-values`
  )
}
export async function setCustomFieldValue(req: Request, res: Response) {
  const { organizationId, issueRef } = issueParamsSchema.parse(req.params)
  const body = setCustomFieldValueBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.setCustomFieldValue(organizationId, issueRef, body)
  )
}
export async function clearCustomFieldValue(req: Request, res: Response) {
  const { organizationId, issueRef, id } = customFieldValueParamsSchema.parse(
    req.params
  )
  return sendProjectsResult(
    res,
    await service.clearCustomFieldValue(organizationId, issueRef, id)
  )
}
