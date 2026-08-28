import type { Request, Response } from 'express'
import { z } from 'zod'

import { crmProvisioningManifestSchema } from '../../types/provisioning.js'
import * as service from './tenants.service.js'

const ensureTenantBodySchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  provisioning: crmProvisioningManifestSchema.optional(),
})
const retrieveTenantQuerySchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export async function ensureTenant(req: Request, res: Response) {
  const { organizationId, provisioning } = ensureTenantBodySchema.parse(req.body)
  res.status(201).json({
    data: await service.ensure(organizationId, provisioning),
    error: null,
  })
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
