import type { Request, Response } from 'express'

import { sendProjectsResult } from '../../http/result.js'
import * as service from './integration.service.js'
import {
  createIntegrationClientBodySchema,
  integrationClientParamsSchema,
  listIntegrationClientsQuerySchema,
} from './integration.schemas.js'

export async function createClient(req: Request, res: Response) {
  const body = createIntegrationClientBodySchema.parse(req.body)
  return sendProjectsResult(res, await service.createClient(body), 201)
}

export async function listClients(req: Request, res: Response) {
  const query = listIntegrationClientsQuerySchema.parse(req.query)
  return sendProjectsResult(
    res,
    await service.listClients(query.organizationId)
  )
}

export async function revokeClient(req: Request, res: Response) {
  const params = integrationClientParamsSchema.parse(req.params)
  const query = listIntegrationClientsQuerySchema.parse(req.query)
  return sendProjectsResult(
    res,
    await service.revokeClient(query.organizationId, params.clientId)
  )
}
