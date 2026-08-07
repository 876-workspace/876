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
  const { user_id } = req.params as { user_id: string }
  const query = req.query as unknown as { scope?: string }
  const scope = query.scope ?? 'account'
  await service.requireUser(user_id)
  const row = await repo.findPin(user_id, scope)
  res.json(serializeUserPin(user_id, row, scope))
}

export async function setUserPin(req: Request, res: Response): Promise<void> {
  const { user_id } = req.params as { user_id: string }
  const body = req.body as { pin: string; scope?: string }
  const scope = body.scope ?? 'account'
  const row = await service.setUserPin(user_id, body.pin, scope)
  res.json(serializeUserPin(user_id, row, scope))
}

export async function verifyUserPin(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id } = req.params as { user_id: string }
  const body = req.body as { pin: string; scope?: string }
  const scope = body.scope ?? 'account'
  // rate limit stub
  const result = await service.verifyUserPin(user_id, body.pin, scope)
  res.json({
    object: 'pin_verification',
    verified: result.verified,
    locked_until: result.lockedUntil,
  })
}

export async function deleteUserPin(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id } = req.params as { user_id: string }
  const query = req.query as unknown as { scope?: string }
  const scope = query.scope ?? 'account'
  await service.requireUser(user_id)
  const cleared = await repo.clearPin(user_id, scope)
  if (!cleared)
    throw new AppHttpError({
      code: 'pin/not-set',
      message: 'No PIN is set for this account.',
      httpStatus: 404,
    })
  await repo.recordPinClearedEvent(user_id, scope, BigInt(nowUnixSeconds()))

  res.json({ object: 'pin', user_id, deleted: true })
}
