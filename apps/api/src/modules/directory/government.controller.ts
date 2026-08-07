/** Read validated input, call one service function, pick a status code. */

import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth/principal'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type {
  ListDirectoryQuery,
  RetrieveDirectoryQuery,
} from './directory.schemas'
import type {
  MinistryCreate,
  MinistryDepartmentCreate,
  MinistryDepartmentUpdate,
  MinistryUpdate,
} from './government.schemas'
import * as service from './government.service'

function isInternal(req: Request): boolean {
  return getPrincipal(req).internal
}

function actor(req: Request): string | null {
  return getPrincipal(req).userId
}

// --- Ministries ---

export async function listMinistries(
  req: Request,
  res: Response
): Promise<void> {
  const query = validQuery<ListDirectoryQuery>(req)

  res.status(200).json(await service.listMinistries(query, isInternal(req)))
}

export async function retrieveMinistry(
  req: Request,
  res: Response
): Promise<void> {
  const { ministry_id } = validParams<{ ministry_id: string }>(req)
  const query = validQuery<RetrieveDirectoryQuery>(req)

  res
    .status(200)
    .json(await service.retrieveMinistry(ministry_id, query, isInternal(req)))
}

export async function createMinistry(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<MinistryCreate>(req)

  res.status(201).json(await service.createMinistry(body))
}

export async function updateMinistry(
  req: Request,
  res: Response
): Promise<void> {
  const { ministry_id } = validParams<{ ministry_id: string }>(req)
  const body = validBody<MinistryUpdate>(req)

  res.status(200).json(await service.updateMinistry(ministry_id, body))
}

export async function deleteMinistry(
  req: Request,
  res: Response
): Promise<void> {
  const { ministry_id } = validParams<{ ministry_id: string }>(req)

  res.status(200).json(await service.deleteMinistry(ministry_id, actor(req)))
}

// --- Ministry departments ---

export async function listMinistryDepartments(
  req: Request,
  res: Response
): Promise<void> {
  const { ministry_id } = validParams<{ ministry_id: string }>(req)
  const query = validQuery<ListDirectoryQuery>(req)

  res
    .status(200)
    .json(
      await service.listMinistryDepartments(ministry_id, query, isInternal(req))
    )
}

export async function retrieveMinistryDepartment(
  req: Request,
  res: Response
): Promise<void> {
  const { department_id } = validParams<{ department_id: string }>(req)
  const query = validQuery<RetrieveDirectoryQuery>(req)

  res
    .status(200)
    .json(
      await service.retrieveMinistryDepartment(
        department_id,
        query,
        isInternal(req)
      )
    )
}

export async function createMinistryDepartment(
  req: Request,
  res: Response
): Promise<void> {
  const { ministry_id } = validParams<{ ministry_id: string }>(req)
  const body = validBody<MinistryDepartmentCreate>(req)

  res
    .status(201)
    .json(await service.createMinistryDepartment(ministry_id, body))
}

export async function updateMinistryDepartment(
  req: Request,
  res: Response
): Promise<void> {
  const { department_id } = validParams<{ department_id: string }>(req)
  const body = validBody<MinistryDepartmentUpdate>(req)

  res
    .status(200)
    .json(await service.updateMinistryDepartment(department_id, body))
}

export async function deleteMinistryDepartment(
  req: Request,
  res: Response
): Promise<void> {
  const { department_id } = validParams<{ department_id: string }>(req)

  res
    .status(200)
    .json(await service.deleteMinistryDepartment(department_id, actor(req)))
}
