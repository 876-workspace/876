import type { Request, Response } from 'express'
import { listObject } from '@/http/envelope'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'
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
  res
    .status(201)
    .json(
      await service.createPackage(tenantId, validBody<CreatePackageBody>(req))
    )
}
export async function retrievePackage(req: Request, res: Response) {
  const { tenantId, id } = validParams<PackageParams>(req)
  res.status(200).json(await service.retrievePackage(tenantId, id))
}
export async function updatePackage(req: Request, res: Response) {
  const { tenantId, id } = validParams<PackageParams>(req)
  res
    .status(200)
    .json(
      await service.updatePackage(
        tenantId,
        id,
        validBody<UpdatePackageBody>(req)
      )
    )
}
