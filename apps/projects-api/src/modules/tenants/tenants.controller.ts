import type { Request, Response } from 'express'

import { sendProjectsError, sendProjectsResult } from '../../http/result.js'
import {
  ensureTenantBodySchema,
  tenantParamsSchema,
} from './tenants.schemas.js'
import * as service from './tenants.service.js'

export async function ensureTenant(req: Request, res: Response) {
  const { organizationId } = ensureTenantBodySchema.parse(req.body)
  const result = await service.ensure(organizationId)
  if (result.error !== null) {
    return sendProjectsError(res, result.error.code)
  }

  const status = result.isNew ? 201 : 200
  return sendProjectsResult(res, { data: result.data, error: null }, status)
}

export async function retrieveTenant(req: Request, res: Response) {
  const { organizationId } = tenantParamsSchema.parse(req.params)
  const result = await service.retrieveByOrganization(organizationId)
  return sendProjectsResult(res, result)
}
