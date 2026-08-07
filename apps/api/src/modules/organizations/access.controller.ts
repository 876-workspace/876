import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth/principal'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type {
  AppAssignmentCreate,
  OrganizationMemberRoleUpdate,
  OrganizationRoleCreate,
  OrganizationRoleUpdate,
} from './access.schemas'
import * as service from './access.service'

function principal(req: Request) {
  return getPrincipal(req) as { internal: boolean; userId: string | null }
}

export async function getPermissionCatalog(
  req: Request,
  res: Response
): Promise<void> {
  res.status(200).json(await service.getPermissionCatalog(principal(req)))
}
export async function listOrgRoles(req: Request, res: Response): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  res.status(200).json(await service.listOrgRoles(org_id, principal(req)))
}
export async function createOrgRole(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  const body = validBody<OrganizationRoleCreate>(req)
  res
    .status(201)
    .json(await service.createOrgRole(org_id, body, principal(req)))
}
export async function retrieveOrgRole(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, role_id } = validParams<{ org_id: string; role_id: string }>(
    req
  )
  res
    .status(200)
    .json(await service.retrieveOrgRole(org_id, role_id, principal(req)))
}
export async function updateOrgRole(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, role_id } = validParams<{ org_id: string; role_id: string }>(
    req
  )
  const body = validBody<OrganizationRoleUpdate>(req)
  res
    .status(200)
    .json(await service.updateOrgRole(org_id, role_id, body, principal(req)))
}
export async function deleteOrgRole(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, role_id } = validParams<{ org_id: string; role_id: string }>(
    req
  )
  res
    .status(200)
    .json(await service.deleteOrgRole(org_id, role_id, principal(req)))
}

export async function listOrgMembers(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  const query = validQuery<{ limit?: number }>(req)
  res
    .status(200)
    .json(
      await service.listOrgMembers(org_id, principal(req), query.limit ?? 50)
    )
}
export async function retrieveOrgMemberMe(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  res
    .status(200)
    .json(await service.retrieveOrgMemberMe(org_id, principal(req)))
}
export async function updateOrgMemberRole(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, membership_id } = validParams<{
    org_id: string
    membership_id: string
  }>(req)
  const body = validBody<OrganizationMemberRoleUpdate>(req)
  res
    .status(200)
    .json(
      await service.updateOrgMemberRole(
        org_id,
        membership_id,
        body,
        principal(req)
      )
    )
}
export async function deleteOrgMember(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, membership_id } = validParams<{
    org_id: string
    membership_id: string
  }>(req)
  res
    .status(200)
    .json(await service.deleteOrgMember(org_id, membership_id, principal(req)))
}

export async function listAppAssignments(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  const query = validQuery<{
    user_id?: string
    app_id?: string
    include_revoked?: boolean
  }>(req)
  res.status(200).json(
    await service.listAppAssignments(org_id, principal(req), {
      userId: query.user_id,
      appId: query.app_id,
      includeRevoked: query.include_revoked,
    })
  )
}
export async function createAppAssignment(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  const body = validBody<AppAssignmentCreate>(req)
  res
    .status(201)
    .json(await service.createAppAssignment(org_id, body, principal(req)))
}
export async function revokeAppAssignment(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, assignment_id } = validParams<{
    org_id: string
    assignment_id: string
  }>(req)
  res
    .status(200)
    .json(
      await service.revokeAppAssignment(org_id, assignment_id, principal(req))
    )
}
