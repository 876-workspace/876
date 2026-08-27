import type { Request, Response } from 'express'
import * as service from './teams.service.js'
import * as s from './teams.schemas.js'
const missing = (res: Response) =>
  res.status(404).json({
    data: null,
    error: { code: 'crm/team-not-found', message: 'Team not found.' },
  })
const listResponse = (res: Response, data: unknown[], url: string) =>
  res.json({
    data: {
      object: 'list',
      data,
      has_more: false,
      total_count: data.length,
      url,
    },
    error: null,
  })
export async function list(req: Request, res: Response) {
  const p = s.organizationParamsSchema.parse(req.params),
    q = s.listTeamsQuerySchema.parse(req.query)
  listResponse(
    res,
    await service.list(p.organizationId, {
      ...q,
      includeMembers: q.includeMembers === 'true',
    }),
    `/v1/organizations/${p.organizationId}/teams`
  )
}
export async function get(req: Request, res: Response) {
  const p = s.teamParamsSchema.parse(req.params),
    x = await service.retrieve(p.organizationId, p.id)
  if (!x) return missing(res)
  res.json({ data: x, error: null })
}
export async function create(req: Request, res: Response) {
  const p = s.organizationParamsSchema.parse(req.params)
  res.status(201).json({
    data: await service.create(
      p.organizationId,
      s.createTeamBodySchema.parse(req.body)
    ),
    error: null,
  })
}
export async function update(req: Request, res: Response) {
  const p = s.teamParamsSchema.parse(req.params),
    x = await service.update(
      p.organizationId,
      p.id,
      s.updateTeamBodySchema.parse(req.body)
    )
  if (!x) return missing(res)
  res.json({ data: x, error: null })
}
export async function remove(req: Request, res: Response) {
  const p = s.teamParamsSchema.parse(req.params),
    x = await service.remove(
      p.organizationId,
      p.id,
      s.deleteTeamBodySchema.parse(req.body)
    )
  if (!x) return missing(res)
  res.json({ data: x, error: null })
}
export async function members(req: Request, res: Response) {
  const p = s.teamParamsSchema.parse(req.params),
    x = await service.listMembers(p.organizationId, p.id)
  if (!x) return missing(res)
  listResponse(
    res,
    x,
    `/v1/organizations/${p.organizationId}/teams/${p.id}/members`
  )
}
export async function addMember(req: Request, res: Response) {
  const p = s.teamParamsSchema.parse(req.params),
    x = await service.addMember(
      p.organizationId,
      p.id,
      s.memberBodySchema.parse(req.body)
    )
  if (!x) return missing(res)
  res.status(201).json({ data: x, error: null })
}
export async function updateMember(req: Request, res: Response) {
  const p = s.memberParamsSchema.parse(req.params),
    x = await service.changeMember(
      p.organizationId,
      p.id,
      p.userId,
      s.updateMemberBodySchema.parse(req.body)
    )
  if (!x) return missing(res)
  res.json({ data: x, error: null })
}
export async function removeMember(req: Request, res: Response) {
  const p = s.memberParamsSchema.parse(req.params),
    x = await service.removeMember(p.organizationId, p.id, p.userId)
  if (!x) return missing(res)
  res.json({ data: x, error: null })
}
