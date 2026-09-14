import { isError, toAppError } from '@876/core'
import type { Error as AppError } from '@876/core/types/errors'
import type { Request, Response } from 'express'

import { listObject } from '@/http/envelope'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import * as service from './package-categories.service'
import type {
  CreatePackageCategoryBody,
  ListPackageCategoriesQuery,
  PackageCategoryParams,
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

  return sendResult(res, result, 201)
}

export async function retrievePackageCategory(req: Request, res: Response) {
  const { tenantId, id } = validParams<PackageCategoryParams>(req)
  const result = await service.retrievePackageCategory(tenantId, id)

  return sendResult(res, result)
}

export async function updatePackageCategory(req: Request, res: Response) {
  const { tenantId, id } = validParams<PackageCategoryParams>(req)
  const result = await service.updatePackageCategory(
    tenantId,
    id,
    validBody<UpdatePackageCategoryBody>(req)
  )

  return sendResult(res, result)
}

export async function deletePackageCategory(req: Request, res: Response) {
  const { tenantId, id } = validParams<PackageCategoryParams>(req)
  const result = await service.deletePackageCategory(tenantId, id)

  return sendResult(res, result)
}

function sendResult(
  res: Response,
  result: unknown,
  status = 200
): Response {
  if (isError(result)) {
    const error = result as AppError
    return res
      .status(error.httpStatus)
      .json({ data: null, error: toAppError(error) })
  }

  return res.status(status).json(result)
}
