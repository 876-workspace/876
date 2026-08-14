import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { validBody, validParams } from '@/http/middleware/validate'

import type {
  MemberUpdateBody,
  RoleCreateBody,
  RoleUpdateBody,
} from './access.schemas'
import {
  createRole,
  deleteRole,
  listRoles,
  retrieveRole,
  updateMember,
  updateRole,
} from './access.service'

function tenantId(req: Request): string {
  const tenant = getPrincipal(req).tenantId
  if (!tenant) throw new Error('Tenant guard did not resolve a tenant.')
  return tenant
}

export const accessController = {
  async listRoles(req: Request, res: Response) {
    res.json(await listRoles(tenantId(req)))
  },
  async createRole(req: Request, res: Response) {
    res
      .status(201)
      .json(await createRole(tenantId(req), validBody<RoleCreateBody>(req)))
  },
  async retrieveRole(req: Request, res: Response) {
    res.json(
      await retrieveRole(
        tenantId(req),
        validParams<{ roleId: string }>(req).roleId
      )
    )
  },
  async updateRole(req: Request, res: Response) {
    res.json(
      await updateRole(
        tenantId(req),
        validParams<{ roleId: string }>(req).roleId,
        validBody<RoleUpdateBody>(req)
      )
    )
  },
  async deleteRole(req: Request, res: Response) {
    res.json(
      await deleteRole(
        tenantId(req),
        validParams<{ roleId: string }>(req).roleId
      )
    )
  },
  async updateMember(req: Request, res: Response) {
    res.json(
      await updateMember(
        tenantId(req),
        validParams<{ userId: string }>(req).userId,
        getPrincipal(req).userId,
        validBody<MemberUpdateBody>(req)
      )
    )
  },
}
