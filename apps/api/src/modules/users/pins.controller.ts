import type { Request, Response } from 'express'
import * as repo from './users.repository'
import * as service from './users.service'
import { serializeUserPin } from './users.serializers'
import { AppHttpError } from '@/http/errors'
import { nowUnixSeconds } from '@/platform/timestamps'

export async function retrieveUserPin(
  req: Request,
  res: Response
): Promise<void> {
  const { userId } = req.params as { userId: string }
  const query = req.query as unknown as { scope?: string }
  const scope = query.scope ?? 'account'
  await service.requireUser(userId)
  const row = await repo.findPin(userId, scope)
  res.json(serializeUserPin(userId, row, scope))
}

export async function setUserPin(req: Request, res: Response): Promise<void> {
  const { userId } = req.params as { userId: string }
  const body = req.body as { pin: string; scope?: string }
  const scope = body.scope ?? 'account'
  const row = await service.setUserPin(userId, body.pin, scope)
  res.json(serializeUserPin(userId, row, scope))
}

export async function verifyUserPin(
  req: Request,
  res: Response
): Promise<void> {
  const { userId } = req.params as { userId: string }
  const body = req.body as { pin: string; scope?: string }
  const scope = body.scope ?? 'account'
  // rate limit stub
  const result = await service.verifyUserPin(userId, body.pin, scope)
  res.json({
    object: 'pin_verification',
    verified: result.verified,
    lockedUntil: result.lockedUntil,
  })
}

export async function deleteUserPin(
  req: Request,
  res: Response
): Promise<void> {
  const { userId } = req.params as { userId: string }
  const query = req.query as unknown as { scope?: string }
  const scope = query.scope ?? 'account'
  await service.requireUser(userId)
  const cleared = await repo.clearPin(userId, scope)
  if (!cleared)
    throw new AppHttpError({
      code: 'pin/not-set',
      message: 'No PIN is set for this account.',
      httpStatus: 404,
    })
  await repo.recordPinClearedEvent(userId, scope, BigInt(nowUnixSeconds()))

  res.json({ object: 'pin', userId, deleted: true })
}
