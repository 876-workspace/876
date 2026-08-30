import type { Request, Response } from 'express'
import {
  sendWorkError,
  sendWorkList,
  sendWorkResult,
} from '../../http/result.js'
import * as service from './sync-mappings.service.js'
import {
  connectionParamsSchema,
  createMappingBodySchema,
  mappingParamsSchema,
  updateMappingBodySchema,
} from './sync-mappings.schemas.js'
export async function listMappings(req: Request, res: Response) {
  const { organizationId, connectionId } = connectionParamsSchema.parse(
    req.params
  )
  const r = await service.list(organizationId, connectionId)
  if (!r) return sendWorkError(res, 'work/sync-connection-not-found')
  return sendWorkList(
    res,
    r,
    `/v1/organizations/${organizationId}/sync-connections/${connectionId}/mappings`
  )
}
export async function createMapping(req: Request, res: Response) {
  const { organizationId, connectionId } = connectionParamsSchema.parse(
    req.params
  )
  const r = await service.create(
    organizationId,
    connectionId,
    createMappingBodySchema.parse(req.body)
  )
  if (!r) return sendWorkError(res, 'work/sync-connection-not-found')
  return sendWorkResult(res, r, 201)
}
export async function updateMapping(req: Request, res: Response) {
  const { organizationId, connectionId, mappingId } = mappingParamsSchema.parse(
    req.params
  )
  const r = await service.update(
    organizationId,
    connectionId,
    mappingId,
    updateMappingBodySchema.parse(req.body)
  )
  if (!r) return sendWorkError(res, 'work/sync-mapping-not-found')
  return sendWorkResult(res, r)
}
export async function deleteMapping(req: Request, res: Response) {
  const { organizationId, connectionId, mappingId } = mappingParamsSchema.parse(
    req.params
  )
  const r = await service.remove(organizationId, connectionId, mappingId)
  if (!r) return sendWorkError(res, 'work/sync-mapping-not-found')
  return sendWorkResult(res, r)
}
