import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { validBody } from '@/http/middleware/validate'

import type { TenantCreateBody } from './tenants.schemas'
import {
  provisionTenant,
  retrieveIntegrationOrganization,
} from './tenants.service'

export const tenantsController = {
  async provision(req: Request, res: Response) {
    const principal = getPrincipal(req)
    if (!principal.organizationId || !principal.userId)
      throw new Error('Organization member guard did not resolve an identity.')
    res.json(
      await provisionTenant(
        principal.organizationId,
        principal.userId,
        validBody<TenantCreateBody>(req)
      )
    )
  },
  async retrieveIntegration(req: Request, res: Response) {
    const tenantId = getPrincipal(req).tenantId
    if (!tenantId)
      throw new Error('Integration guard did not resolve a tenant.')
    res.json(await retrieveIntegrationOrganization(tenantId))
  },
}
