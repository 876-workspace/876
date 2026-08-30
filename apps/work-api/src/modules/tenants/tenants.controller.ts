import type { Request, Response } from 'express'

import { sendWorkResult } from '../../http/result.js'
import * as service from './tenants.service.js'
import { ensureTenantBodySchema } from './tenants.schemas.js'

export async function ensureTenant(req: Request, res: Response) {
  const { organizationId } = ensureTenantBodySchema.parse(req.body)
  return sendWorkResult(res, await service.ensure(organizationId))
}
