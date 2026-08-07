/** Read validated input, call one service function, pick a status code. */

import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth/principal'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type {
  ListDirectoryQuery,
  RetrieveDirectoryQuery,
} from './directory.schemas'
import type {
  SecondarySchoolCreate,
  SecondarySchoolUpdate,
  UniversityCampusCreate,
  UniversityCampusUpdate,
  UniversityCreate,
  UniversityUpdate,
} from './education.schemas'
import * as service from './education.service'

function isInternal(req: Request): boolean {
  return getPrincipal(req).internal
}

function actor(req: Request): string | null {
  return getPrincipal(req).userId
}

// --- Universities ---

export async function listUniversities(
  req: Request,
  res: Response
): Promise<void> {
  const query = validQuery<ListDirectoryQuery>(req)

  res.status(200).json(await service.listUniversities(query, isInternal(req)))
}

export async function retrieveUniversity(
  req: Request,
  res: Response
): Promise<void> {
  const { university_id } = validParams<{ university_id: string }>(req)
  const query = validQuery<RetrieveDirectoryQuery>(req)

  res
    .status(200)
    .json(
      await service.retrieveUniversity(university_id, query, isInternal(req))
    )
}

export async function createUniversity(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<UniversityCreate>(req)

  res.status(201).json(await service.createUniversity(body))
}

export async function updateUniversity(
  req: Request,
  res: Response
): Promise<void> {
  const { university_id } = validParams<{ university_id: string }>(req)
  const body = validBody<UniversityUpdate>(req)

  res.status(200).json(await service.updateUniversity(university_id, body))
}

export async function deleteUniversity(
  req: Request,
  res: Response
): Promise<void> {
  const { university_id } = validParams<{ university_id: string }>(req)

  res
    .status(200)
    .json(await service.deleteUniversity(university_id, actor(req)))
}

// --- University campuses ---

export async function listUniversityCampuses(
  req: Request,
  res: Response
): Promise<void> {
  const { university_id } = validParams<{ university_id: string }>(req)
  const query = validQuery<ListDirectoryQuery>(req)

  res
    .status(200)
    .json(
      await service.listUniversityCampuses(
        university_id,
        query,
        isInternal(req)
      )
    )
}

export async function retrieveUniversityCampus(
  req: Request,
  res: Response
): Promise<void> {
  const { campus_id } = validParams<{ campus_id: string }>(req)
  const query = validQuery<RetrieveDirectoryQuery>(req)

  res
    .status(200)
    .json(
      await service.retrieveUniversityCampus(campus_id, query, isInternal(req))
    )
}

export async function createUniversityCampus(
  req: Request,
  res: Response
): Promise<void> {
  const { university_id } = validParams<{ university_id: string }>(req)
  const body = validBody<UniversityCampusCreate>(req)

  res
    .status(201)
    .json(await service.createUniversityCampus(university_id, body))
}

export async function updateUniversityCampus(
  req: Request,
  res: Response
): Promise<void> {
  const { campus_id } = validParams<{ campus_id: string }>(req)
  const body = validBody<UniversityCampusUpdate>(req)

  res.status(200).json(await service.updateUniversityCampus(campus_id, body))
}

export async function deleteUniversityCampus(
  req: Request,
  res: Response
): Promise<void> {
  const { campus_id } = validParams<{ campus_id: string }>(req)

  res
    .status(200)
    .json(await service.deleteUniversityCampus(campus_id, actor(req)))
}

// --- Secondary schools ---

export async function listSecondarySchools(
  req: Request,
  res: Response
): Promise<void> {
  const query = validQuery<ListDirectoryQuery>(req)

  res
    .status(200)
    .json(await service.listSecondarySchools(query, isInternal(req)))
}

export async function retrieveSecondarySchool(
  req: Request,
  res: Response
): Promise<void> {
  const { school_id } = validParams<{ school_id: string }>(req)
  const query = validQuery<RetrieveDirectoryQuery>(req)

  res
    .status(200)
    .json(
      await service.retrieveSecondarySchool(school_id, query, isInternal(req))
    )
}

export async function createSecondarySchool(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<SecondarySchoolCreate>(req)

  res.status(201).json(await service.createSecondarySchool(body))
}

export async function updateSecondarySchool(
  req: Request,
  res: Response
): Promise<void> {
  const { school_id } = validParams<{ school_id: string }>(req)
  const body = validBody<SecondarySchoolUpdate>(req)

  res.status(200).json(await service.updateSecondarySchool(school_id, body))
}

export async function deleteSecondarySchool(
  req: Request,
  res: Response
): Promise<void> {
  const { school_id } = validParams<{ school_id: string }>(req)

  res
    .status(200)
    .json(await service.deleteSecondarySchool(school_id, actor(req)))
}
