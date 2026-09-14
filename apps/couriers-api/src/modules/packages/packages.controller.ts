import type { Request, Response } from 'express'

import { listObject } from '@/http/envelope'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'
import { sendAppResult } from '@/http/result'

import * as service from './packages.service'
import type {
  CreatePackageBody,
  ListPackagesQuery,
  PackageParams,
  TenantParams,
  UpdatePackageBody,
} from './packages.schemas'

export async function listPackages(req: Request, res: Response) {
  const { tenantId } = validParams<TenantParams>(req)
  const result = await service.listPackages(
    tenantId,
    validQuery<ListPackagesQuery>(req)
  )

  res.status(200).json(
    listObject({
      data: result.data,
      hasMore: result.hasMore,
      url: `/v1/tenants/${tenantId}/packages`,
    })
  )
}

export async function createPackage(req: Request, res: Response) {
  const { tenantId } = validParams<TenantParams>(req)
  const result = await service.createPackage(
    tenantId,
    validBody<CreatePackageBody>(req)
  )

  return sendAppResult(res, result, 201)
}

export async function retrievePackage(req: Request, res: Response) {
  const { tenantId, id } = validParams<PackageParams>(req)
  const result = await service.retrievePackage(tenantId, id)

  return sendAppResult(res, result)
}

export async function updatePackage(req: Request, res: Response) {
  const { tenantId, id } = validParams<PackageParams>(req)
  const result = await service.updatePackage(
    tenantId,
    id,
    validBody<UpdatePackageBody>(req)
  )

  return sendAppResult(res, result)
}
