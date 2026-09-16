import { z } from 'zod'

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
import {
  createWebhookEndpointBodySchema,
  listDeliveriesQuerySchema,
  updateWebhookEndpointBodySchema,
  webhookEndpointParamsSchema,
} from '../webhooks/webhooks.schemas.js'
import { phaseParamsSchema } from './integration.phases.js'
import type { IntegrationScope } from './integration.schemas.js'

export type IntegrationOperation = {
  operationId: string
  method: 'get' | 'post' | 'patch' | 'delete'
  path: string
  summary: string
  scopes: IntegrationScope[]
  params?: z.ZodType
  query?: z.ZodType
  body?: z.ZodType
}

export const INTEGRATION_OPERATIONS: IntegrationOperation[] = [
  {
    operationId: 'integration.listProjects',
    method: 'get',
    path: '/v1/integration/projects',
    summary: 'List projects visible to the integration client.',
    scopes: ['projects:read'],
    query: listProjectsQuerySchema,
  },
  {
    operationId: 'integration.createProject',
    method: 'post',
    path: '/v1/integration/projects',
    summary: 'Create a project.',
    scopes: ['projects:write'],
    body: createProjectBodySchema,
  },
  {
    operationId: 'integration.retrieveProject',
    method: 'get',
    path: '/v1/integration/projects/{projectId}',
    summary: 'Retrieve a project.',
    scopes: ['projects:read'],
    params: projectParamsSchema,
  },
  {
    operationId: 'integration.updateProject',
    method: 'patch',
    path: '/v1/integration/projects/{projectId}',
    summary: 'Update a project.',
    scopes: ['projects:write'],
    params: projectParamsSchema,
    body: updateProjectBodySchema,
  },
  {
    operationId: 'integration.listWorkItems',
    method: 'get',
    path: '/v1/integration/work-items',
    summary: 'List work items visible to the integration client.',
    scopes: ['projects:read'],
    query: listIssuesQuerySchema,
  },
  {
    operationId: 'integration.createWorkItem',
    method: 'post',
    path: '/v1/integration/work-items',
    summary: 'Create a work item.',
    scopes: ['projects:write'],
    body: createIssueBodySchema,
  },
  {
    operationId: 'integration.retrieveWorkItem',
    method: 'get',
    path: '/v1/integration/work-items/{issueRef}',
    summary: 'Retrieve a work item.',
    scopes: ['projects:read'],
    params: issueParamsSchema,
  },
  {
    operationId: 'integration.updateWorkItem',
    method: 'patch',
    path: '/v1/integration/work-items/{issueRef}',
    summary: 'Update a work item.',
    scopes: ['projects:write'],
    params: issueParamsSchema,
    body: updateIssueBodySchema,
  },
  {
    operationId: 'integration.listPhases',
    method: 'get',
    path: '/v1/integration/phases',
    summary: 'List phases (milestones) for a project.',
    scopes: ['projects:read'],
    query: milestoneListQuerySchema,
  },
  {
    operationId: 'integration.createPhase',
    method: 'post',
    path: '/v1/integration/phases',
    summary: 'Create a phase (milestone).',
    scopes: ['projects:write'],
    body: createMilestoneBodySchema,
  },
  {
    operationId: 'integration.retrievePhase',
    method: 'get',
    path: '/v1/integration/phases/{phaseId}',
    summary: 'Retrieve a phase (milestone).',
    scopes: ['projects:read'],
    params: phaseParamsSchema,
  },
  {
    operationId: 'integration.updatePhase',
    method: 'patch',
    path: '/v1/integration/phases/{phaseId}',
    summary: 'Update a phase (milestone).',
    scopes: ['projects:write'],
    params: phaseParamsSchema,
    body: updateMilestoneBodySchema,
  },
  {
    operationId: 'integration.listTimeEntries',
    method: 'get',
    path: '/v1/integration/time-entries',
    summary: 'List time entries.',
    scopes: ['time:read'],
    query: listTimeEntriesQuerySchema,
  },
  {
    operationId: 'integration.createTimeEntry',
    method: 'post',
    path: '/v1/integration/time-entries',
    summary: 'Log a time entry.',
    scopes: ['time:write'],
    body: createTimeEntryBodySchema,
  },
  {
    operationId: 'integration.listWebhookEndpoints',
    method: 'get',
    path: '/v1/integration/webhook-endpoints',
    summary: 'List webhook endpoints.',
    scopes: ['webhooks:manage'],
  },
  {
    operationId: 'integration.createWebhookEndpoint',
    method: 'post',
    path: '/v1/integration/webhook-endpoints',
    summary: 'Register a webhook endpoint.',
    scopes: ['webhooks:manage'],
    body: createWebhookEndpointBodySchema,
  },
  {
    operationId: 'integration.retrieveWebhookEndpoint',
    method: 'get',
    path: '/v1/integration/webhook-endpoints/{endpointId}',
    summary: 'Retrieve a webhook endpoint.',
    scopes: ['webhooks:manage'],
    params: webhookEndpointParamsSchema,
  },
  {
    operationId: 'integration.updateWebhookEndpoint',
    method: 'patch',
    path: '/v1/integration/webhook-endpoints/{endpointId}',
    summary: 'Update a webhook endpoint.',
    scopes: ['webhooks:manage'],
    params: webhookEndpointParamsSchema,
    body: updateWebhookEndpointBodySchema,
  },
  {
    operationId: 'integration.deleteWebhookEndpoint',
    method: 'delete',
    path: '/v1/integration/webhook-endpoints/{endpointId}',
    summary: 'Delete a webhook endpoint.',
    scopes: ['webhooks:manage'],
    params: webhookEndpointParamsSchema,
  },
  {
    operationId: 'integration.listWebhookDeliveries',
    method: 'get',
    path: '/v1/integration/webhook-deliveries',
    summary: 'List webhook deliveries.',
    scopes: ['webhooks:manage'],
    query: listDeliveriesQuerySchema,
  },
  {
    operationId: 'integration.exportWorkItemsCsv',
    method: 'get',
    path: '/v1/integration/exports/work-items.csv',
    summary: 'Export work items as CSV.',
    scopes: ['projects:read'],
  },
  {
    operationId: 'integration.exportTimeEntriesCsv',
    method: 'get',
    path: '/v1/integration/exports/time-entries.csv',
    summary: 'Export time entries as CSV.',
    scopes: ['time:read'],
  },
]

export type IntegrationOpenApiDocument = {
  openapi: string
  info: { title: string; version: string }
  paths: Record<string, Record<string, unknown>>
}

export function buildIntegrationOpenApi(): IntegrationOpenApiDocument {
  const paths: Record<string, Record<string, unknown>> = {}
  for (const operation of INTEGRATION_OPERATIONS) {
    const expressPath = operation.path.replace(
      /:([a-zA-Z0-9_]+)/g,
      '{$1}'
    )
    const entry: Record<string, unknown> = {
      operationId: operation.operationId,
      summary: operation.summary,
      security: [{ integrationBearer: operation.scopes }],
    }
    if (operation.query)
      entry.parameters = [
        {
          name: 'query',
          in: 'query',
          schema: z.toJSONSchema(operation.query, { unrepresentable: 'any' }),
        },
      ]
    if (operation.body)
      entry.requestBody = {
        required: true,
        content: {
          'application/json': { schema: z.toJSONSchema(operation.body, { unrepresentable: 'any' }) },
        },
      }
    paths[expressPath] = { ...(paths[expressPath] ?? {}), [operation.method]: entry }
  }
  return {
    openapi: '3.1.0',
    info: { title: '876 Projects Integration API', version: '1.0.0' },
    paths,
  }
}
