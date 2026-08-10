import type { Request, Response } from 'express'
import { listObject } from '@/http/envelope'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'
import * as service from './team.service'
import type {
  IdParams,
  MemberBody,
  MemberListQuery,
  MemberPatchBody,
  RoleBody,
  RolePatchBody,
  TenantParams,
} from './team.schemas'
export async function retrieveRole(req: Request, res: Response) {
  const { tenantId, id } = validParams<IdParams>(req)
  res.status(200).json(await service.retrieveRole(tenantId, id))
}
export async function listRoles(req: Request, res: Response) {
  const { tenantId } = validParams<TenantParams>(req)
  res.status(200).json(
    listObject({
      data: await service.listRoles(tenantId),
      hasMore: false,
      url: `/v1/tenants/${tenantId}/roles`,
    })
  )
}
export async function createRole(req: Request, res: Response) {
  const { tenantId } = validParams<TenantParams>(req)
  res
    .status(201)
    .json(await service.createRole(tenantId, validBody<RoleBody>(req)))
}
export async function updateRole(req: Request, res: Response) {
  const { tenantId, id } = validParams<IdParams>(req)
  res
    .status(200)
    .json(await service.updateRole(tenantId, id, validBody<RolePatchBody>(req)))
}
export async function deleteRole(req: Request, res: Response) {
  const { tenantId, id } = validParams<IdParams>(req)
  res.status(200).json(await service.deleteRole(tenantId, id))
}
export async function listMembers(req: Request, res: Response) {
  const { tenantId } = validParams<TenantParams>(req)
  const { status } = validQuery<MemberListQuery>(req)
  res.status(200).json(
    listObject({
      data: await service.listMembers(tenantId, status),
      hasMore: false,
      url: `/v1/tenants/${tenantId}/team`,
    })
  )
}
export async function createMember(req: Request, res: Response) {
  const { tenantId } = validParams<TenantParams>(req)
  res
    .status(201)
    .json(await service.createMember(tenantId, validBody<MemberBody>(req)))
}
export async function updateMember(req: Request, res: Response) {
  const { tenantId, id } = validParams<IdParams>(req)
  res
    .status(200)
    .json(
      await service.updateMember(tenantId, id, validBody<MemberPatchBody>(req))
    )
}
export async function deleteMember(req: Request, res: Response) {
  const { tenantId, id } = validParams<IdParams>(req)
  res.status(200).json(await service.deleteMember(tenantId, id))
}
