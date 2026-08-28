import type { Request, Response } from 'express'
import { z } from 'zod'

import { sendCrmError, sendCrmResult } from '../../http/result.js'
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
  const result = await service.ensure(organizationId, provisioning)
  return sendCrmResult(res, result, 201)
}

export async function retrieveTenant(req: Request, res: Response) {
  const { organizationId } = retrieveTenantQuerySchema.parse(req.query)
  const result = await service.retrieveByOrganization(organizationId)
  if (!result) return sendCrmError(res, 'crm/tenant-not-found')
  return sendCrmResult(res, result)
}
