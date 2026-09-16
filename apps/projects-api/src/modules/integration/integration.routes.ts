import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './integration.controller.js'
import {
  requireIntegrationClient,
  requireIntegrationScope,
} from './integration.guard.js'
import * as internalController from './integration.internal-controller.js'

export function createIntegrationRouter(): Router {
  const router = Router()

  router.use(requireIntegrationClient)
  router.get('/openapi.json', controller.getOpenApi)

  router.get(
    '/projects',
    requireIntegrationScope('projects:read'),
    controller.listProjects
  )
  router.post(
    '/projects',
    requireIntegrationScope('projects:write'),
    controller.createProject
  )
  router.get(
    '/projects/:projectId',
    requireIntegrationScope('projects:read'),
    controller.retrieveProject
  )
  router.patch(
    '/projects/:projectId',
    requireIntegrationScope('projects:write'),
    controller.updateProject
  )

  router.get(
    '/work-items',
    requireIntegrationScope('projects:read'),
    controller.listWorkItems
  )
  router.post(
    '/work-items',
    requireIntegrationScope('projects:write'),
    controller.createWorkItem
  )
  router.get(
    '/work-items/:issueRef',
    requireIntegrationScope('projects:read'),
    controller.retrieveWorkItem
  )
  router.patch(
    '/work-items/:issueRef',
    requireIntegrationScope('projects:write'),
    controller.updateWorkItem
  )

  router.get(
    '/phases',
    requireIntegrationScope('projects:read'),
    controller.listPhases
  )
  router.post(
    '/phases',
    requireIntegrationScope('projects:write'),
    controller.createPhase
  )
  router.get(
    '/phases/:phaseId',
    requireIntegrationScope('projects:read'),
    controller.retrievePhase
  )
  router.patch(
    '/phases/:phaseId',
    requireIntegrationScope('projects:write'),
    controller.updatePhase
  )

  router.get(
    '/time-entries',
    requireIntegrationScope('time:read'),
    controller.listTimeEntries
  )
  router.post(
    '/time-entries',
    requireIntegrationScope('time:write'),
    controller.createTimeEntry
  )

  router.get(
    '/webhook-endpoints',
    requireIntegrationScope('webhooks:manage'),
    controller.listWebhookEndpoints
  )
  router.post(
    '/webhook-endpoints',
    requireIntegrationScope('webhooks:manage'),
    controller.createWebhookEndpoint
  )
  router.get(
    '/webhook-endpoints/:endpointId',
    requireIntegrationScope('webhooks:manage'),
    controller.retrieveWebhookEndpoint
  )
  router.patch(
    '/webhook-endpoints/:endpointId',
    requireIntegrationScope('webhooks:manage'),
    controller.updateWebhookEndpoint
  )
  router.delete(
    '/webhook-endpoints/:endpointId',
    requireIntegrationScope('webhooks:manage'),
    controller.removeWebhookEndpoint
  )
  router.get(
    '/webhook-deliveries',
    requireIntegrationScope('webhooks:manage'),
    controller.listWebhookDeliveries
  )

  router.get(
    '/exports/work-items.csv',
    requireIntegrationScope('projects:read'),
    controller.exportWorkItemsCsv
  )
  router.get(
    '/exports/time-entries.csv',
    requireIntegrationScope('time:read'),
    controller.exportTimeEntriesCsv
  )

  return router
}

export function createIntegrationInternalRouter(): Router {
  const router = Router()

  router.post(
    '/integration-clients',
    requireInternalKey,
    internalController.createClient
  )
  router.get(
    '/integration-clients',
    requireInternalKey,
    internalController.listClients
  )
  router.post(
    '/integration-clients/:clientId/revoke',
    requireInternalKey,
    internalController.revokeClient
  )

  return router
}
