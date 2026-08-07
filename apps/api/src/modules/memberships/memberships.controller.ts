import type { Request, Response } from 'express'

import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type {
  CreateMembershipBody,
  ListMembershipsQuery,
  UpdateMembershipBody,
} from './memberships.schemas'
import * as service from './memberships.service'

export async function listMemberships(req: Request, res: Response) {
  const query = validQuery<ListMembershipsQuery>(req)
  const result = await service.listMemberships(query)
  res.json(result)
}

export async function createMembership(req: Request, res: Response) {
  const body = validBody<CreateMembershipBody>(req)
  const data = await service.createMembership(body)
  res.status(201).json(data)
}

export async function retrieveMembership(req: Request, res: Response) {
  const { membership_id } = validParams<{ membership_id: string }>(req)
  const data = await service.retrieveMembership(membership_id)
  res.json(data)
}

export async function updateMembership(req: Request, res: Response) {
  const { membership_id } = validParams<{ membership_id: string }>(req)
  const body = validBody<UpdateMembershipBody>(req)
  const data = await service.updateMembership(membership_id, body)
  res.json(data)
}

export async function deleteMembership(req: Request, res: Response) {
  const { membership_id } = validParams<{ membership_id: string }>(req)
  const data = await service.deleteMembership(membership_id)
  res.json(data)
}
