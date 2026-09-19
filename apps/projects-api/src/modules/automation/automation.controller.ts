import type { Request, Response } from 'express'
import { z } from 'zod'

import {
  sendProjectsError,
  sendProjectsList,
  sendProjectsResult,
} from '../../http/result.js'
import { getSessionUserId } from '../../http/session-auth.js'
import {
  createRuleBodySchema,
  drainBodySchema,
  listNotificationsQuerySchema,
  notificationParamsSchema,
  organizationParamsSchema,
  ruleParamsSchema,
  testRuleBodySchema,
  updateRuleBodySchema,
} from './automation.schemas.js'
import * as service from './automation.service.js'

const testRuleWithScopeSchema = testRuleBodySchema.extend({
  projectId: z.string().trim().min(1).optional(),
})

export async function listRules(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const result = await service.listRules(params.organizationId)
  return sendProjectsList(
    res,
    result,
    `/v1/organizations/${params.organizationId}/automation-rules`
  )
}

export async function createRule(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const body = createRuleBodySchema.parse(req.body)
  const result = await service.createRule(params.organizationId, body)
  return sendProjectsResult(res, result, 201)
}

export async function retrieveRule(req: Request, res: Response) {
  const params = ruleParamsSchema.parse(req.params)
  const result = await service.retrieveRule(params.organizationId, params.id)
  return sendProjectsResult(res, result)
}

export async function updateRule(req: Request, res: Response) {
  const params = ruleParamsSchema.parse(req.params)
  const body = updateRuleBodySchema.parse(req.body)
  const result = await service.updateRule(
    params.organizationId,
    params.id,
    body
  )
  return sendProjectsResult(res, result)
}

export async function removeRule(req: Request, res: Response) {
  const params = ruleParamsSchema.parse(req.params)
  const result = await service.removeRule(params.organizationId, params.id)
  return sendProjectsResult(res, result)
}

export async function listRuns(req: Request, res: Response) {
  const params = ruleParamsSchema.parse(req.params)
  const result = await service.listRuns(params.organizationId, params.id)
  return sendProjectsList(
    res,
    result,
    `/v1/organizations/${params.organizationId}/automation-rules/${params.id}/runs`
  )
}

export async function testRule(req: Request, res: Response) {
  const params = ruleParamsSchema.parse(req.params)
  const body = testRuleWithScopeSchema.parse(req.body)
  const result = await service.testRule(
    params.organizationId,
    params.id,
    body
  )
  return sendProjectsResult(res, result)
}

export async function listNotifications(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = listNotificationsQuerySchema.parse(req.query)
  const sessionUserId = getSessionUserId(res)
  if (sessionUserId && query.userId !== sessionUserId)
    return sendProjectsError(res, 'projects/forbidden')
  const result = await service.listNotifications(
    params.organizationId,
    query.userId
  )
  return sendProjectsList(
    res,
    result,
    `/v1/organizations/${params.organizationId}/notifications`
  )
}

export async function readNotification(req: Request, res: Response) {
  const params = notificationParamsSchema.parse(req.params)
  const result = await service.readNotification(
    params.organizationId,
    params.id
  )
  return sendProjectsResult(res, result)
}

export function parseDrainLimit(req: Request): number {
  const parsed = drainBodySchema.parse(req.body ?? {})
  return parsed.limit ?? 50
}
