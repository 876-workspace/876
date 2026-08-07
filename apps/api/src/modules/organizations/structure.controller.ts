import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth/principal'
import { validBody, validParams } from '@/http/middleware/validate'

import type {
  EmployeeProfileCreate,
  EmployeeProfileUpdate,
  OrgContactCreate,
  OrgContactUpdate,
  OrgDepartmentCreate,
  OrgDepartmentUpdate,
  OrgLocationCreate,
  OrgLocationUpdate,
} from './structure.schemas'
import * as service from './structure.service'

function principal(req: Request) {
  return getPrincipal(req) as { internal: boolean; userId: string | null }
}

export async function listOrgLocations(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  res.status(200).json(await service.listOrgLocations(org_id, principal(req)))
}
export async function createOrgLocation(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  const body = validBody<OrgLocationCreate>(req)
  res
    .status(201)
    .json(await service.createOrgLocation(org_id, body, principal(req)))
}
export async function retrieveOrgLocation(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, location_id } = validParams<{
    org_id: string
    location_id: string
  }>(req)
  res
    .status(200)
    .json(
      await service.retrieveOrgLocation(org_id, location_id, principal(req))
    )
}
export async function updateOrgLocation(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, location_id } = validParams<{
    org_id: string
    location_id: string
  }>(req)
  const body = validBody<OrgLocationUpdate>(req)
  res
    .status(200)
    .json(
      await service.updateOrgLocation(org_id, location_id, body, principal(req))
    )
}
export async function deleteOrgLocation(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, location_id } = validParams<{
    org_id: string
    location_id: string
  }>(req)
  res
    .status(200)
    .json(await service.deleteOrgLocation(org_id, location_id, principal(req)))
}

export async function listOrgContacts(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  res.status(200).json(await service.listOrgContacts(org_id, principal(req)))
}
export async function createOrgContact(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  const body = validBody<OrgContactCreate>(req)
  res
    .status(201)
    .json(await service.createOrgContact(org_id, body, principal(req)))
}
export async function retrieveOrgContact(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, contact_id } = validParams<{
    org_id: string
    contact_id: string
  }>(req)
  res
    .status(200)
    .json(await service.retrieveOrgContact(org_id, contact_id, principal(req)))
}
export async function updateOrgContact(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, contact_id } = validParams<{
    org_id: string
    contact_id: string
  }>(req)
  const body = validBody<OrgContactUpdate>(req)
  res
    .status(200)
    .json(
      await service.updateOrgContact(org_id, contact_id, body, principal(req))
    )
}
export async function deleteOrgContact(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, contact_id } = validParams<{
    org_id: string
    contact_id: string
  }>(req)
  res
    .status(200)
    .json(await service.deleteOrgContact(org_id, contact_id, principal(req)))
}

export async function listOrgDepartments(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  res.status(200).json(await service.listOrgDepartments(org_id, principal(req)))
}
export async function createOrgDepartment(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  const body = validBody<OrgDepartmentCreate>(req)
  res
    .status(201)
    .json(await service.createOrgDepartment(org_id, body, principal(req)))
}
export async function retrieveOrgDepartment(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, department_id } = validParams<{
    org_id: string
    department_id: string
  }>(req)
  res
    .status(200)
    .json(
      await service.retrieveOrgDepartment(org_id, department_id, principal(req))
    )
}
export async function updateOrgDepartment(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, department_id } = validParams<{
    org_id: string
    department_id: string
  }>(req)
  const body = validBody<OrgDepartmentUpdate>(req)
  res
    .status(200)
    .json(
      await service.updateOrgDepartment(
        org_id,
        department_id,
        body,
        principal(req)
      )
    )
}
export async function deleteOrgDepartment(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, department_id } = validParams<{
    org_id: string
    department_id: string
  }>(req)
  res
    .status(200)
    .json(
      await service.deleteOrgDepartment(org_id, department_id, principal(req))
    )
}

export async function listOrgEmployees(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  res.status(200).json(await service.listOrgEmployees(org_id, principal(req)))
}
export async function createOrgEmployee(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  const body = validBody<EmployeeProfileCreate>(req)
  res
    .status(201)
    .json(await service.createOrgEmployee(org_id, body, principal(req)))
}
export async function retrieveOrgEmployee(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, profile_id } = validParams<{
    org_id: string
    profile_id: string
  }>(req)
  res
    .status(200)
    .json(await service.retrieveOrgEmployee(org_id, profile_id, principal(req)))
}
export async function updateOrgEmployee(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, profile_id } = validParams<{
    org_id: string
    profile_id: string
  }>(req)
  const body = validBody<EmployeeProfileUpdate>(req)
  res
    .status(200)
    .json(
      await service.updateOrgEmployee(org_id, profile_id, body, principal(req))
    )
}
export async function deleteOrgEmployee(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, profile_id } = validParams<{
    org_id: string
    profile_id: string
  }>(req)
  res
    .status(200)
    .json(await service.deleteOrgEmployee(org_id, profile_id, principal(req)))
}

export async function retrieveMyOrgDetails(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  res
    .status(200)
    .json(await service.retrieveMyOrgDetails(org_id, principal(req)))
}
export async function updateMyOrgDetails(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  const body = validBody<Record<string, unknown>>(req)
  res
    .status(200)
    .json(await service.updateMyOrgDetails(org_id, body, principal(req)))
}
