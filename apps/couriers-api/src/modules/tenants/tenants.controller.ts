import type { Request, Response } from 'express'

import { validParams, validQuery } from '@/http/middleware/validate'

import * as service from './tenants.service'
import type {
  ListTenantsQuery,
  TenantIdParams,
  TenantOrgIdParams,
} from './tenants.schemas'

export async function retrieveTenant(
  req: Request,
  res: Response
): Promise<void> {
  const { id } = validParams<TenantIdParams>(req)
  const tenant = await service.retrieveTenant(id)
  res.status(200).json(tenant)
}

export async function retrieveTenantByOrgId(
  req: Request,
  res: Response
): Promise<void> {
  const { orgId } = validParams<TenantOrgIdParams>(req)
  const tenant = await service.retrieveTenantByOrgId(orgId)
  res.status(200).json(tenant)
}

export async function listTenants(req: Request, res: Response): Promise<void> {
  const query = validQuery<ListTenantsQuery>(req)
  const { tenants, hasMore, totalCount } = await service.listTenants(query)
  res.status(200).json({
    object: 'list',
    data: tenants,
    has_more: hasMore,
    url: '/v1/tenants',
    total_count: totalCount,
  })
}
