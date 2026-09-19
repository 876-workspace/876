import type { Request, Response } from 'express'
import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import {
  captureParamsSchema,
  createCaptureBodySchema,
  listCapturesQuerySchema,
  organizationParamsSchema,
  promoteCaptureBodySchema,
  updateCaptureBodySchema,
} from './captures.schemas.js'
import * as service from './captures.service.js'
export async function list(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = listCapturesQuerySchema.parse(req.query)
  return sendProjectsList(
    res,
    await service.list(params.organizationId, query.status),
    `/v1/organizations/${params.organizationId}/captures`
  )
}
export async function create(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.create(
      params.organizationId,
      createCaptureBodySchema.parse(req.body)
    ),
    201
  )
}
export async function update(req: Request, res: Response) {
  const params = captureParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.update(
      params.organizationId,
      params.captureId,
      updateCaptureBodySchema.parse(req.body)
    )
  )
}
export async function promote(req: Request, res: Response) {
  const params = captureParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.promote(
      params.organizationId,
      params.captureId,
      promoteCaptureBodySchema.parse(req.body)
    )
  )
}
export async function discard(req: Request, res: Response) {
  const params = captureParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.discard(params.organizationId, params.captureId)
  )
}
export async function remove(req: Request, res: Response) {
  const params = captureParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.remove(params.organizationId, params.captureId)
  )
}
