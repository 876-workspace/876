import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import {
  cloneMilestoneBodySchema,
  createMilestoneCustomFieldBodySchema,
  createMilestoneWithActorBodySchema,
  milestoneCommentBodySchema,
  milestoneCommentDeleteQuerySchema,
  milestoneCommentVisibilityBodySchema,
  milestoneCommentParamsSchema,
  milestoneCommentUpdateBodySchema,
  milestoneDetailParamsSchema,
  milestoneFieldParamsSchema,
  setMilestoneCustomFieldsBodySchema,
  updateMilestoneCustomFieldBodySchema,
  updateMilestoneWithActorBodySchema,
} from './milestone-details.schemas.js'
import * as service from './milestone-details.service.js'
import { organizationParamsSchema } from './work-structure.schemas.js'

export async function createMilestone(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createMilestone(
      organizationId,
      createMilestoneWithActorBodySchema.parse(req.body)
    ),
    201
  )
}

export async function updateMilestone(req: Request, res: Response) {
  const { organizationId, id } = milestoneDetailParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateMilestone(
      organizationId,
      id,
      updateMilestoneWithActorBodySchema.parse(req.body)
    )
  )
}

export async function retrieveSummary(req: Request, res: Response) {
  const { organizationId, id } = milestoneDetailParamsSchema.parse(req.params)
  return sendProjectsResult(res, await service.milestoneSummary(organizationId, id))
}

export async function listComments(req: Request, res: Response) {
  const { organizationId, id } = milestoneDetailParamsSchema.parse(req.params)
  return sendProjectsList(
    res,
    await service.listComments(organizationId, id),
    `/v1/organizations/${organizationId}/milestones/${id}/comments`
  )
}

export async function createComment(req: Request, res: Response) {
  const { organizationId, id } = milestoneDetailParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createComment(
      organizationId,
      id,
      milestoneCommentBodySchema.parse(req.body)
    ),
    201
  )
}

export async function updateComment(req: Request, res: Response) {
  const { organizationId, id, commentId } = milestoneCommentParamsSchema.parse(
    req.params
  )
  return sendProjectsResult(
    res,
    await service.updateComment(
      organizationId,
      id,
      commentId,
      milestoneCommentUpdateBodySchema.parse(req.body)
    )
  )
}

export async function removeComment(req: Request, res: Response) {
  const { organizationId, id, commentId } = milestoneCommentParamsSchema.parse(
    req.params
  )
  const { actorUserId } = milestoneCommentDeleteQuerySchema.parse(req.query)
  return sendProjectsResult(
    res,
    await service.deleteComment(organizationId, id, commentId, actorUserId)
  )
}

export async function listEvents(req: Request, res: Response) {
  const { organizationId, id } = milestoneDetailParamsSchema.parse(req.params)
  return sendProjectsList(
    res,
    await service.listEvents(organizationId, id),
    `/v1/organizations/${organizationId}/milestones/${id}/events`
  )
}

export async function listCustomFields(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendProjectsList(
    res,
    await service.listCustomFields(organizationId),
    `/v1/organizations/${organizationId}/milestone-custom-fields`
  )
}

export async function createCustomField(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createCustomField(
      organizationId,
      createMilestoneCustomFieldBodySchema.parse(req.body)
    ),
    201
  )
}

export async function updateCustomField(req: Request, res: Response) {
  const { organizationId, fieldId } = milestoneFieldParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateCustomField(
      organizationId,
      fieldId,
      updateMilestoneCustomFieldBodySchema.parse(req.body)
    )
  )
}

export async function removeCustomField(req: Request, res: Response) {
  const { organizationId, fieldId } = milestoneFieldParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.deleteCustomField(organizationId, fieldId)
  )
}

export async function listCustomFieldValues(req: Request, res: Response) {
  const { organizationId, id } = milestoneDetailParamsSchema.parse(req.params)
  return sendProjectsList(
    res,
    await service.listCustomFieldValues(organizationId, id),
    `/v1/organizations/${organizationId}/milestones/${id}/custom-field-values`
  )
}

export async function setCustomFieldValues(req: Request, res: Response) {
  const { organizationId, id } = milestoneDetailParamsSchema.parse(req.params)
  return sendProjectsList(
    res,
    await service.setCustomFieldValues(
      organizationId,
      id,
      setMilestoneCustomFieldsBodySchema.parse(req.body)
    ),
    `/v1/organizations/${organizationId}/milestones/${id}/custom-field-values`
  )
}

export async function cloneMilestone(req: Request, res: Response) {
  const { organizationId, id } = milestoneDetailParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.cloneMilestone(
      organizationId,
      id,
      cloneMilestoneBodySchema.parse(req.body)
    ),
    201
  )
}

export async function setCommentVisibility(req: Request, res: Response) {
  const { organizationId, id, commentId } =
    milestoneCommentParamsSchema.parse(req.params)
  const { clientVisible } = milestoneCommentVisibilityBodySchema.parse(
    req.body
  )
  return sendProjectsResult(
    res,
    await service.setMilestoneCommentVisibility(
      organizationId,
      id,
      commentId,
      clientVisible
    )
  )
}
