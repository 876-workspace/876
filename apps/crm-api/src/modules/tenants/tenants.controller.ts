import type { Request, Response } from 'express'
import { z } from 'zod'

import * as service from './tenants.service.js'

const ensureTenantBodySchema = z.object({ organizationId: z.string().min(1) })
const retrieveTenantQuerySchema = z.object({
  organizationId: z.string().min(1),
})

export async function ensureTenant(req: Request, res: Response) {
  const { organizationId } = ensureTenantBodySchema.parse(req.body)
  res
    .status(201)
    .json({ data: await service.ensure(organizationId), error: null })
}

export async function retrieveTenant(req: Request, res: Response) {
  const { organizationId } = retrieveTenantQuerySchema.parse(req.query)
  const data = await service.retrieveByOrganization(organizationId)
  if (!data)
    return res.status(404).json({
      data: null,
      error: {
        code: 'crm/tenant-not-found',
        message: 'This organization has no CRM workspace yet.',
      },
    })
  res.json({ data, error: null })
}
