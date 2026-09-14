import { isError } from '@876/core'
import type { Request, Response } from 'express'

import { listObject } from '@/http/envelope'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'
import { sendAppResult } from '@/http/result'

import * as service from './package-categories.service'
import type {
  CreatePackageCategoryBody,
  ListPackageCategoriesQuery,
  PackageCategoryParams,
  ReconcilePackageCategoriesBody,
  TenantParams,
  UpdatePackageCategoryBody,
} from './package-categories.schemas'

export async function listPackageCategories(req: Request, res: Response) {
  const { tenantId } = validParams<TenantParams>(req)
  const result = await service.listPackageCategories(
    tenantId,
    validQuery<ListPackageCategoriesQuery>(req)
  )

  res.status(200).json(
    listObject({
      data: result.data,
      hasMore: result.hasMore,
      url: `/v1/tenants/${tenantId}/package-categories`,
    })
  )
}

export async function createPackageCategory(req: Request, res: Response) {
  const { tenantId } = validParams<TenantParams>(req)
  const result = await service.createPackageCategory(
    tenantId,
    validBody<CreatePackageCategoryBody>(req)
  )

  return sendAppResult(res, result, 201)
}

export async function reconcilePackageCategories(req: Request, res: Response) {
  const { tenantId } = validParams<TenantParams>(req)
  const body = validBody<ReconcilePackageCategoriesBody>(req)
  const result = await service.reconcileProvisionedPackageCategories(
    tenantId,
    body.categories
  )
  if (isError(result)) return sendAppResult(res, result)

  return res.status(200).json({
    object: 'package_category_reconciliation',
    revision: body.revision,
    reconciled: result.reconciled,
  })
}

export async function retrievePackageCategory(req: Request, res: Response) {
  const { tenantId, id } = validParams<PackageCategoryParams>(req)
  const result = await service.retrievePackageCategory(tenantId, id)

  return sendAppResult(res, result)
}

export async function updatePackageCategory(req: Request, res: Response) {
  const { tenantId, id } = validParams<PackageCategoryParams>(req)
  const result = await service.updatePackageCategory(
    tenantId,
    id,
    validBody<UpdatePackageCategoryBody>(req)
  )

  return sendAppResult(res, result)
}

export async function deletePackageCategory(req: Request, res: Response) {
  const { tenantId, id } = validParams<PackageCategoryParams>(req)
  const result = await service.deletePackageCategory(tenantId, id)

  return sendAppResult(res, result)
}
