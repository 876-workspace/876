import type { Request, Response } from 'express'

import { sendWorkError, sendWorkList, sendWorkResult } from '../../http/result.js'
import * as service from './recurrence-rules.service.js'
import {
  createRecurrenceBodySchema,
  organizationParamsSchema,
  recurrenceParamsSchema,
  updateRecurrenceBodySchema,
} from './recurrence-rules.schemas.js'

export async function listRules(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendWorkList(res, await service.list(organizationId), `/v1/organizations/${organizationId}/recurrence-rules`)
}
export async function retrieveRule(req: Request, res: Response) {
  const { organizationId, ruleId } = recurrenceParamsSchema.parse(req.params)
  const result = await service.retrieve(organizationId, ruleId)
  if (!result) return sendWorkError(res, 'work/recurrence-rule-not-found')
  return sendWorkResult(res, result)
}
export async function createRule(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendWorkResult(res, await service.create(organizationId, createRecurrenceBodySchema.parse(req.body)), 201)
}
export async function updateRule(req: Request, res: Response) {
  const { organizationId, ruleId } = recurrenceParamsSchema.parse(req.params)
  const result = await service.update(organizationId, ruleId, updateRecurrenceBodySchema.parse(req.body))
  if (!result) return sendWorkError(res, 'work/recurrence-rule-not-found')
  return sendWorkResult(res, result)
}
export async function deleteRule(req: Request, res: Response) {
  const { organizationId, ruleId } = recurrenceParamsSchema.parse(req.params)
  const result = await service.remove(organizationId, ruleId)
  if (!result) return sendWorkError(res, 'work/recurrence-rule-not-found')
  return sendWorkResult(res, result)
}
