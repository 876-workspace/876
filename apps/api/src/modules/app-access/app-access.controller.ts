import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth/principal'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type {
  CreateAppMembershipBody,
  CreateAppPermissionBody,
  CreateAppRoleBody,
  ListAppMembershipsQuery,
  SyncAppPermissionsBody,
  UpdateAppMembershipBody,
  UpdateAppPermissionBody,
  UpdateAppRoleBody,
} from './app-access.schemas'
import * as service from './app-access.service'

function principal(req: Request) {
  return getPrincipal(req) as { internal: boolean; userId: string | null }
}

export async function listAppPermissions(req: Request, res: Response): Promise<void> {
  const { app_id } = validParams<{ app_id: string }>(req)
  res.status(200).json(await service.listAppPermissions(app_id))
}

export async function createAppPermission(req: Request, res: Response): Promise<void> {
  const { app_id } = validParams<{ app_id: string }>(req)
  const body = validBody<CreateAppPermissionBody>(req)
  res.status(201).json(await service.createAppPermission(app_id, body))
}

export async function updateAppPermission(req: Request, res: Response): Promise<void> {
  const { app_id, permission_id } = validParams<{ app_id: string; permission_id: string }>(req)
  const body = validBody<UpdateAppPermissionBody>(req)
  res.status(200).json(await service.updateAppPermission(app_id, permission_id, body))
}

export async function deleteAppPermission(req: Request, res: Response): Promise<void> {
  const { app_id, permission_id } = validParams<{ app_id: string; permission_id: string }>(req)
  res.status(200).json(await service.deleteAppPermission(app_id, permission_id))
}

export async function syncAppPermissions(req: Request, res: Response): Promise<void> {
  const { app_id } = validParams<{ app_id: string }>(req)
  const body = validBody<SyncAppPermissionsBody>(req)
  res.status(200).json(await service.syncAppPermissions(app_id, body))
}

export async function listAppRoleTemplates(req: Request, res: Response): Promise<void> {
  const { app_id } = validParams<{ app_id: string }>(req)
  res.status(200).json(await service.listAppRoleTemplates(app_id))
}

export async function createAppRoleTemplate(req: Request, res: Response): Promise<void> {
  const { app_id } = validParams<{ app_id: string }>(req)
  const body = validBody<CreateAppRoleBody>(req)
  res.status(201).json(await service.createAppRoleTemplate(app_id, body))
}

export async function retrieveAppRoleTemplate(req: Request, res: Response): Promise<void> {
  const { app_id, role_id } = validParams<{ app_id: string; role_id: string }>(req)
  res.status(200).json(await service.retrieveAppRoleTemplate(app_id, role_id))
}

export async function updateAppRoleTemplate(req: Request, res: Response): Promise<void> {
  const { app_id, role_id } = validParams<{ app_id: string; role_id: string }>(req)
  const body = validBody<UpdateAppRoleBody>(req)
  res.status(200).json(await service.updateAppRoleTemplate(app_id, role_id, body))
}

export async function deleteAppRoleTemplate(req: Request, res: Response): Promise<void> {
  const { app_id, role_id } = validParams<{ app_id: string; role_id: string }>(req)
  res.status(200).json(await service.deleteAppRoleTemplate(app_id, role_id))
}

export async function listOrgAppRoles(req: Request, res: Response): Promise<void> {
  const { org_id, app_id } = validParams<{ org_id: string; app_id: string }>(req)
  res.status(200).json(await service.listOrgAppRoles(org_id, app_id, principal(req)))
}

export async function createOrgAppRole(req: Request, res: Response): Promise<void> {
  const { org_id, app_id } = validParams<{ org_id: string; app_id: string }>(req)
  const body = validBody<CreateAppRoleBody>(req)
  res.status(201).json(await service.createOrgAppRole(org_id, app_id, body, principal(req)))
}

export async function retrieveOrgAppRole(req: Request, res: Response): Promise<void> {
  const { org_id, app_id, role_id } = validParams<{ org_id: string; app_id: string; role_id: string }>(req)
  res.status(200).json(await service.retrieveOrgAppRole(org_id, app_id, role_id, principal(req)))
}

export async function updateOrgAppRole(req: Request, res: Response): Promise<void> {
  const { org_id, app_id, role_id } = validParams<{ org_id: string; app_id: string; role_id: string }>(req)
  const body = validBody<UpdateAppRoleBody>(req)
  res.status(200).json(await service.updateOrgAppRole(org_id, app_id, role_id, body, principal(req)))
}

export async function deleteOrgAppRole(req: Request, res: Response): Promise<void> {
  const { org_id, app_id, role_id } = validParams<{ org_id: string; app_id: string; role_id: string }>(req)
  res.status(200).json(await service.deleteOrgAppRole(org_id, app_id, role_id, principal(req)))
}

export async function listAppMemberships(req: Request, res: Response): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  const query = validQuery<ListAppMembershipsQuery>(req)
  res.status(200).json(await service.listAppMemberships(org_id, query, principal(req)))
}

export async function createAppMembership(req: Request, res: Response): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  const body = validBody<CreateAppMembershipBody>(req)
  res.status(201).json(await service.createAppMembership(org_id, body, principal(req)))
}

export async function retrieveAppMembership(req: Request, res: Response): Promise<void> {
  const { org_id, assignment_id } = validParams<{ org_id: string; assignment_id: string }>(req)
  res.status(200).json(await service.retrieveAppMembership(org_id, assignment_id, principal(req)))
}

export async function updateAppMembership(req: Request, res: Response): Promise<void> {
  const { org_id, assignment_id } = validParams<{ org_id: string; assignment_id: string }>(req)
  const body = validBody<UpdateAppMembershipBody>(req)
  res.status(200).json(await service.updateAppMembership(org_id, assignment_id, body, principal(req)))
}

export async function deleteAppMembership(req: Request, res: Response): Promise<void> {
  const { org_id, assignment_id } = validParams<{ org_id: string; assignment_id: string }>(req)
  res.status(200).json(await service.deleteAppMembership(org_id, assignment_id, principal(req)))
}

export async function listAppMembershipsForMember(req: Request, res: Response): Promise<void> {
  const { org_id, membership_id } = validParams<{ org_id: string; membership_id: string }>(req)
  res.status(200).json(await service.listAppMembershipsForMember(org_id, membership_id, principal(req)))
}

export async function listMembersForApp(req: Request, res: Response): Promise<void> {
  const { org_id, app_id } = validParams<{ org_id: string; app_id: string }>(req)
  res.status(200).json(await service.listMembersForApp(org_id, app_id, principal(req)))
}

export async function retrieveMyAppMembership(req: Request, res: Response): Promise<void> {
  const { org_id, app_id } = validParams<{ org_id: string; app_id: string }>(req)
  res.status(200).json(await service.retrieveMyAppMembership(org_id, app_id, principal(req)))
}
