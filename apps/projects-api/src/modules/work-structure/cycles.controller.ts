import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import {
  assignCycleIssuesBodySchema,
  createCycleBodySchema,
  cycleIssueParamsSchema,
  cycleParamsSchema,
  listCyclesQuerySchema,
  unassignCycleIssueQuerySchema,
  updateCycleBodySchema,
} from './cycles.schemas.js'
import * as service from './cycles.service.js'
import { organizationParamsSchema } from './work-structure.schemas.js'

export async function listCycles(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const query = listCyclesQuerySchema.parse(req.query)
  return sendProjectsList(
    res,
    await service.listCycles(organizationId, query.projectId, query.status),
    `/v1/organizations/${organizationId}/cycles`
  )
}

export async function createCycle(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createCycle(
      organizationId,
      createCycleBodySchema.parse(req.body)
    ),
    201
  )
}

export async function retrieveCycle(req: Request, res: Response) {
  const { organizationId, id } = cycleParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveCycle(organizationId, id)
  )
}

export async function updateCycle(req: Request, res: Response) {
  const { organizationId, id } = cycleParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateCycle(
      organizationId,
      id,
      updateCycleBodySchema.parse(req.body)
    )
  )
}

export async function removeCycle(req: Request, res: Response) {
  const { organizationId, id } = cycleParamsSchema.parse(req.params)
  return sendProjectsResult(res, await service.removeCycle(organizationId, id))
}

export async function assignIssues(req: Request, res: Response) {
  const { organizationId, id } = cycleParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.assignIssues(
      organizationId,
      id,
      assignCycleIssuesBodySchema.parse(req.body)
    )
  )
}

export async function unassignIssue(req: Request, res: Response) {
  const { organizationId, id, issueId } = cycleIssueParamsSchema.parse(
    req.params
  )
  const query = unassignCycleIssueQuerySchema.parse(req.query)
  return sendProjectsResult(
    res,
    await service.unassignIssue(organizationId, id, issueId, query.actorUserId)
  )
}
