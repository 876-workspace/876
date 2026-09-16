import type { Request, Response } from 'express'

import {
  sendProjectsList,
  sendProjectsResult,
} from '../../http/result.js'
import * as issues from '../issues/index.js'
import * as projects from '../projects/index.js'
import * as time from '../time/index.js'
import * as workStructure from '../work-structure/index.js'
import {
  createIssueBodySchema,
  issueParamsSchema,
  listIssuesQuerySchema,
  updateIssueBodySchema,
} from '../issues/issues.schemas.js'
import {
  createProjectBodySchema,
  listProjectsQuerySchema,
  projectParamsSchema,
  updateProjectBodySchema,
} from '../projects/projects.schemas.js'
import {
  createTimeEntryBodySchema,
  listTimeEntriesQuerySchema,
} from '../time/time.schemas.js'
import {
  createMilestoneBodySchema,
  milestoneListQuerySchema,
  updateMilestoneBodySchema,
} from '../work-structure/work-structure.schemas.js'
import { phaseParamsSchema } from './integration.phases.js'
import {
  createWebhookEndpointBodySchema,
  listDeliveriesQuerySchema,
  updateWebhookEndpointBodySchema,
  webhookEndpointParamsSchema,
} from '../webhooks/webhooks.schemas.js'
import * as webhooks from '../webhooks/index.js'
import {
  exportTimeEntriesQuerySchema,
  exportWorkItemsQuerySchema,
} from '../exports/exports.schemas.js'
import * as exportsService from '../exports/index.js'
import { sendProjectsError } from '../../http/result.js'
import { getIntegrationContext } from './integration.guard.js'
import { buildIntegrationOpenApi } from './integration.openapi.js'

function organizationId(req: Request): string {
  const context = getIntegrationContext(req)
  return context?.organizationId ?? ''
}

function paramsWithOrganization(req: Request): Record<string, string> {
  return { organizationId: organizationId(req), ...req.params }
}

export async function getOpenApi(req: Request, res: Response) {
  void req
  return res.json({ data: buildIntegrationOpenApi(), error: null })
}

export async function listProjects(req: Request, res: Response) {
  const query = listProjectsQuerySchema.parse(req.query)
  return sendProjectsList(
    res,
    await projects.list(organizationId(req), query),
    '/v1/integration/projects'
  )
}

export async function createProject(req: Request, res: Response) {
  const body = createProjectBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await projects.create(organizationId(req), body),
    201
  )
}

export async function retrieveProject(req: Request, res: Response) {
  const params = projectParamsSchema.parse(paramsWithOrganization(req))
  return sendProjectsResult(
    res,
    await projects.retrieve(organizationId(req), params.projectId)
  )
}

export async function updateProject(req: Request, res: Response) {
  const params = projectParamsSchema.parse(paramsWithOrganization(req))
  const body = updateProjectBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await projects.update(organizationId(req), params.projectId, body)
  )
}

export async function listWorkItems(req: Request, res: Response) {
  const query = listIssuesQuerySchema.parse(req.query)
  return sendProjectsList(
    res,
    await issues.list(organizationId(req), query),
    '/v1/integration/work-items'
  )
}

export async function createWorkItem(req: Request, res: Response) {
  const body = createIssueBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await issues.create(organizationId(req), body),
    201
  )
}

export async function retrieveWorkItem(req: Request, res: Response) {
  const params = issueParamsSchema.parse(paramsWithOrganization(req))
  return sendProjectsResult(
    res,
    await issues.retrieve(organizationId(req), params.issueRef)
  )
}

export async function updateWorkItem(req: Request, res: Response) {
  const params = issueParamsSchema.parse(paramsWithOrganization(req))
  const body = updateIssueBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await issues.update(organizationId(req), params.issueRef, body)
  )
}

export async function listPhases(req: Request, res: Response) {
  const query = milestoneListQuerySchema.parse(req.query)
  const result = await workStructure.listMilestones(
    organizationId(req),
    query.projectId,
    query.status
  )
  return sendProjectsList(res, result, '/v1/integration/phases')
}

export async function createPhase(req: Request, res: Response) {
  const body = createMilestoneBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await workStructure.createMilestone(organizationId(req), body),
    201
  )
}

export async function retrievePhase(req: Request, res: Response) {
  const params = phaseParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await workStructure.retrieveMilestone(
      organizationId(req),
      params.phaseId
    )
  )
}

export async function updatePhase(req: Request, res: Response) {
  const params = phaseParamsSchema.parse(req.params)
  const body = updateMilestoneBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await workStructure.updateMilestone(
      organizationId(req),
      params.phaseId,
      body
    )
  )
}

export async function listTimeEntries(req: Request, res: Response) {
  const query = listTimeEntriesQuerySchema.parse(req.query)
  return sendProjectsList(
    res,
    await time.listTimeEntries(organizationId(req), query),
    '/v1/integration/time-entries'
  )
}

export async function createTimeEntry(req: Request, res: Response) {
  const body = createTimeEntryBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await time.createTimeEntry(organizationId(req), body),
    201
  )
}

export async function listWebhookEndpoints(req: Request, res: Response) {
  return sendProjectsList(
    res,
    await webhooks.listEndpoints(organizationId(req)),
    '/v1/integration/webhook-endpoints'
  )
}

export async function createWebhookEndpoint(req: Request, res: Response) {
  const body = createWebhookEndpointBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await webhooks.createEndpoint(organizationId(req), body),
    201
  )
}

export async function retrieveWebhookEndpoint(req: Request, res: Response) {
  const params = webhookEndpointParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await webhooks.retrieveEndpoint(organizationId(req), params.endpointId)
  )
}

export async function updateWebhookEndpoint(req: Request, res: Response) {
  const params = webhookEndpointParamsSchema.parse(req.params)
  const body = updateWebhookEndpointBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await webhooks.updateEndpoint(
      organizationId(req),
      params.endpointId,
      body
    )
  )
}

export async function listWebhookDeliveries(req: Request, res: Response) {
  const query = listDeliveriesQuerySchema.parse(req.query)
  const result = await webhooks.listDeliveries(
    organizationId(req),
    query
  )
  if (result.error !== null) return sendProjectsResult(res, result)
  return res.json({
    data: {
      object: 'list',
      data: result.data,
      has_more: result.data.length >= (query.limit ?? 25),
      total_count: null,
      url: '/v1/integration/webhook-deliveries',
    },
    error: null,
  })
}

export async function removeWebhookEndpoint(req: Request, res: Response) {
  const params = webhookEndpointParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await webhooks.removeEndpoint(organizationId(req), params.endpointId)
  )
}

export async function exportWorkItemsCsv(req: Request, res: Response) {
  const query = exportWorkItemsQuerySchema.parse(req.query)
  const result = await exportsService.buildWorkItemsCsv(
    organizationId(req),
    query
  )
  if ('error' in result)
    return sendProjectsError(res, result.error.code)
  return res.status(200).type('text/csv').send(result.csv)
}

export async function exportTimeEntriesCsv(req: Request, res: Response) {
  const query = exportTimeEntriesQuerySchema.parse(req.query)
  const result = await exportsService.buildTimeEntriesCsv(
    organizationId(req),
    query
  )
  if ('error' in result)
    return sendProjectsError(res, result.error.code)
  return res.status(200).type('text/csv').send(result.csv)
}
