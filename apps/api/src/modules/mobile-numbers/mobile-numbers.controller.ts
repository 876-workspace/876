import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { validBody, validParams } from '@/http/middleware/validate'

import type {
  ApproveVerificationBody,
  CreateMobileNumberBody,
  CreateVerificationBody,
  UpdateMobileNumberBody,
} from './mobile-numbers.schemas'
import * as service from './mobile-numbers.service'

export async function createMobileNumber(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<CreateMobileNumberBody>(req)
  const userId = getPrincipal(req).userId as string

  const data = await service.createMobileNumber(userId, body.number, body.type)
  res.status(201).json(data)
}

export async function listMobileNumbers(
  req: Request,
  res: Response
): Promise<void> {
  const userId = getPrincipal(req).userId as string

  const data = await service.listMobileNumbers(userId)
  res.status(200).json(data)
}

export async function retrieveMobileNumber(
  req: Request,
  res: Response
): Promise<void> {
  const { mobile_number_id } = validParams<{ mobile_number_id: string }>(req)
  const userId = getPrincipal(req).userId as string

  const data = await service.retrieveMobileNumber(userId, mobile_number_id)
  res.status(200).json(data)
}

export async function updateMobileNumber(
  req: Request,
  res: Response
): Promise<void> {
  const { mobile_number_id } = validParams<{ mobile_number_id: string }>(req)
  const body = validBody<UpdateMobileNumberBody>(req)
  const userId = getPrincipal(req).userId as string

  const data = await service.updateMobileNumber(
    userId,
    mobile_number_id,
    body.type
  )
  res.status(200).json(data)
}

export async function deleteMobileNumber(
  req: Request,
  res: Response
): Promise<void> {
  const { mobile_number_id } = validParams<{ mobile_number_id: string }>(req)
  const userId = getPrincipal(req).userId as string

  const data = await service.deleteMobileNumber(userId, mobile_number_id)
  res.status(200).json(data)
}

export async function createVerification(
  req: Request,
  res: Response
): Promise<void> {
  const { mobile_number_id } = validParams<{ mobile_number_id: string }>(req)
  const body = validBody<CreateVerificationBody>(req)
  const userId = getPrincipal(req).userId as string

  const data = await service.createVerification(
    userId,
    mobile_number_id,
    body.channel
  )
  res.status(201).json(data)
}

export async function approveVerification(
  req: Request,
  res: Response
): Promise<void> {
  const { mobile_number_id, verification_id } = validParams<{
    mobile_number_id: string
    verification_id: string
  }>(req)
  const body = validBody<ApproveVerificationBody>(req)
  const userId = getPrincipal(req).userId as string

  const data = await service.approveVerification(
    userId,
    mobile_number_id,
    verification_id,
    body.code,
    body.make_primary
  )
  res.status(200).json(data)
}

export async function makePrimary(req: Request, res: Response): Promise<void> {
  const { mobile_number_id } = validParams<{ mobile_number_id: string }>(req)
  const userId = getPrincipal(req).userId as string

  const data = await service.makePrimary(userId, mobile_number_id)
  res.status(200).json(data)
}
