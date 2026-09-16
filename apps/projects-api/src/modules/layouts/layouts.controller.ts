import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import {
  createLayoutBodySchema,
  layoutParamsSchema,
  listLayoutsQuerySchema,
  organizationParamsSchema,
  resolveLayoutQuerySchema,
  updateLayoutBodySchema,
} from './layouts.schemas.js'
import * as service from './layouts.service.js'

export async function list(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = listLayoutsQuerySchema.parse(req.query)
  return sendProjectsList(
    res,
    await service.listLayouts(params.organizationId, query),
    `/v1/organizations/${params.organizationId}/layouts`
  )
}

export async function create(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createLayout(
      params.organizationId,
      createLayoutBodySchema.parse(req.body)
    ),
    201
  )
}

export async function retrieve(req: Request, res: Response) {
  const params = layoutParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveLayout(params.organizationId, params.id)
  )
}

export async function update(req: Request, res: Response) {
  const params = layoutParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateLayout(
      params.organizationId,
      params.id,
      updateLayoutBodySchema.parse(req.body)
    )
  )
}

export async function remove(req: Request, res: Response) {
  const params = layoutParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removeLayout(params.organizationId, params.id)
  )
}

export async function makeDefault(req: Request, res: Response) {
  const params = layoutParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.makeDefaultLayout(params.organizationId, params.id)
  )
}

export async function resolve(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = resolveLayoutQuerySchema.parse(req.query)
  return sendProjectsResult(
    res,
    await service.resolveLayout(
      params.organizationId,
      query.entity,
      query.workItemTypeId ?? null
    )
  )
}
