import { isError, toAppError } from '@876/core'
import type { Request, Response } from 'express'

import { sendCrmError, sendCrmResult } from '../../http/result.js'
import * as s from './teams.schemas.js'
import * as service from './teams.service.js'

function listResponse(res: Response, data: unknown[], url: string) {
  return res.json({
    data: {
      object: 'list',
      data,
      has_more: false,
      total_count: data.length,
      url,
    },
    error: null,
  })
}

function errorResult(res: Response, result: unknown) {
  if (!isError(result)) return null
  res
    .status(result.httpStatus)
    .json({ data: null, error: toAppError(result) })
  return true
}

export async function list(req: Request, res: Response) {
  const p = s.organizationParamsSchema.parse(req.params)
  const q = s.listTeamsQuerySchema.parse(req.query)
  const result = await service.list(p.organizationId, {
    ...q,
    includeMembers: q.includeMembers === 'true',
  })
  if (errorResult(res, result)) return
  return listResponse(
    res,
    result as unknown[],
    `/v1/organizations/${p.organizationId}/teams`
  )
}

export async function get(req: Request, res: Response) {
  const p = s.teamParamsSchema.parse(req.params)
  const result = await service.retrieve(p.organizationId, p.id)
  if (!result) return sendCrmError(res, 'crm/team-not-found')
  return sendCrmResult(res, result)
}

export async function create(req: Request, res: Response) {
  const p = s.organizationParamsSchema.parse(req.params)
  const result = await service.create(
    p.organizationId,
    s.createTeamBodySchema.parse(req.body)
  )
  return sendCrmResult(res, result, 201)
}

export async function update(req: Request, res: Response) {
  const p = s.teamParamsSchema.parse(req.params)
  const result = await service.update(
    p.organizationId,
    p.id,
    s.updateTeamBodySchema.parse(req.body)
  )
  if (!result) return sendCrmError(res, 'crm/team-not-found')
  return sendCrmResult(res, result)
}

export async function remove(req: Request, res: Response) {
  const p = s.teamParamsSchema.parse(req.params)
  const result = await service.remove(
    p.organizationId,
    p.id,
    s.deleteTeamBodySchema.parse(req.body)
  )
  if (!result) return sendCrmError(res, 'crm/team-not-found')
  return sendCrmResult(res, result)
}

export async function members(req: Request, res: Response) {
  const p = s.teamParamsSchema.parse(req.params)
  const result = await service.listMembers(p.organizationId, p.id)
  if (!result) return sendCrmError(res, 'crm/team-not-found')
  if (errorResult(res, result)) return
  return listResponse(
    res,
    result as unknown[],
    `/v1/organizations/${p.organizationId}/teams/${p.id}/members`
  )
}

export async function addMember(req: Request, res: Response) {
  const p = s.teamParamsSchema.parse(req.params)
  const result = await service.addMember(
    p.organizationId,
    p.id,
    s.memberBodySchema.parse(req.body)
  )
  if (!result) return sendCrmError(res, 'crm/team-not-found')
  return sendCrmResult(res, result, 201)
}

export async function updateMember(req: Request, res: Response) {
  const p = s.memberParamsSchema.parse(req.params)
  const result = await service.changeMember(
    p.organizationId,
    p.id,
    p.userId,
    s.updateMemberBodySchema.parse(req.body)
  )
  if (!result) return sendCrmError(res, 'crm/team-not-found')
  return sendCrmResult(res, result)
}

export async function removeMember(req: Request, res: Response) {
  const p = s.memberParamsSchema.parse(req.params)
  const result = await service.removeMember(p.organizationId, p.id, p.userId)
  if (!result) return sendCrmError(res, 'crm/team-not-found')
  return sendCrmResult(res, result)
}
