import type { Request, Response } from 'express'

import {
  sendCrmError,
  sendCrmList,
  sendCrmResult,
} from '../../http/result.js'
import * as s from './categories.schemas.js'
import * as service from './categories.service.js'

export async function all(req: Request, res: Response) {
  const params = s.org.parse(req.params)
  const result = await service.list(params.organizationId)
  return sendCrmList(
    res,
    result,
    `/v1/organizations/${params.organizationId}/request-categories`
  )
}

export async function get(req: Request, res: Response) {
  const params = s.category.parse(req.params)
  const result = await service.retrieve(params.organizationId, params.id)
  if (!result) return sendCrmError(res, 'crm/category-not-found')
  return sendCrmResult(res, result)
}

export async function create(req: Request, res: Response) {
  const params = s.org.parse(req.params)
  const result = await service.create(
    params.organizationId,
    s.create.parse(req.body)
  )
  return sendCrmResult(res, result, 201)
}

export async function update(req: Request, res: Response) {
  const params = s.category.parse(req.params)
  const result = await service.update(
    params.organizationId,
    params.id,
    s.update.parse(req.body)
  )
  if (!result) return sendCrmError(res, 'crm/category-not-found')
  return sendCrmResult(res, result)
}

export async function remove(req: Request, res: Response) {
  const params = s.category.parse(req.params)
  const result = await service.remove(
    params.organizationId,
    params.id,
    s.deletion.parse(req.body)
  )
  if (!result) return sendCrmError(res, 'crm/category-not-found')
  return sendCrmResult(res, result)
}

export async function addSub(req: Request, res: Response) {
  const params = s.category.parse(req.params)
  const result = await service.createSub(
    params.organizationId,
    params.id,
    s.create.parse(req.body)
  )
  return sendCrmResult(res, result, 201)
}

export async function patchSub(req: Request, res: Response) {
  const params = s.subcategory.parse(req.params)
  const result = await service.updateSub(
    params.organizationId,
    params.id,
    params.subcategoryId,
    s.update.parse(req.body)
  )
  if (!result) return sendCrmError(res, 'crm/subcategory-not-found')
  return sendCrmResult(res, result)
}

export async function deleteSub(req: Request, res: Response) {
  const params = s.subcategory.parse(req.params)
  const result = await service.removeSub(
    params.organizationId,
    params.id,
    params.subcategoryId,
    s.deletion.parse(req.body)
  )
  if (!result) return sendCrmError(res, 'crm/subcategory-not-found')
  return sendCrmResult(res, result)
}
