import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { errors } from '@/http/errors'
import { listObject } from '@/http/envelope'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'
import { sendAppResult } from '@/http/result'

import type {
  PortalPackageParams,
  PortalEnrollmentBody,
  PortalPackagesQuery,
  PortalTenantResolveQuery,
  PortalTenantParams,
} from './portal.schemas'
import * as service from './portal.service'

export async function retrievePortalCustomer(
  req: Request,
  res: Response
): Promise<void> {
  const { tenantId } = validParams<PortalTenantParams>(req)
  res
    .status(200)
    .json(await service.retrievePortalCustomer(tenantId, userId(req)))
}

export async function resolvePortalTenant(
  req: Request,
  res: Response
): Promise<void> {
  res
    .status(200)
    .json(
      await service.resolvePortalTenant(
        validQuery<PortalTenantResolveQuery>(req)
      )
    )
}

export async function enrollPortalCustomer(
  req: Request,
  res: Response
): Promise<void> {
  const { tenantId } = validParams<PortalTenantParams>(req)
  res
    .status(201)
    .json(
      await service.enrollPortalCustomer(
        tenantId,
        userId(req),
        validBody<PortalEnrollmentBody>(req)
      )
    )
}

export async function listPortalPackages(
  req: Request,
  res: Response
): Promise<void> {
  const { tenantId } = validParams<PortalTenantParams>(req)
  const result = await service.listPortalPackages(
    tenantId,
    userId(req),
    validQuery<PortalPackagesQuery>(req)
  )

  res.status(200).json(
    listObject({
      data: result.data,
      hasMore: result.hasMore,
      url: `/v1/portal/tenants/${tenantId}/packages`,
    })
  )
}

export async function retrievePortalPackage(
  req: Request,
  res: Response
): Promise<void> {
  const { tenantId, id } = validParams<PortalPackageParams>(req)
  const result = await service.retrievePortalPackage(tenantId, userId(req), id)

  sendAppResult(res, result)
}

export async function retrievePortalShippingAddress(
  req: Request,
  res: Response
): Promise<void> {
  const { tenantId } = validParams<PortalTenantParams>(req)
  res
    .status(200)
    .json(await service.retrievePortalShippingAddress(tenantId, userId(req)))
}

function userId(req: Request): string {
  const value = getPrincipal(req).userId
  if (!value) throw errors.noSession()
  return value
}
