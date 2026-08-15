import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { validParams, validQuery } from '@/http/middleware/validate'

import type {
  ListSessionsQuery,
  ListUserSessionsQuery,
} from './sessions.schemas'
import * as service from './sessions.service'

export async function listSessions(req: Request, res: Response): Promise<void> {
  const query = validQuery<ListSessionsQuery>(req)

  res.status(200).json(await service.listSessions(query))
}

export async function retrieveSession(
  req: Request,
  res: Response
): Promise<void> {
  const { sessionId } = validParams<{ sessionId: string }>(req)

  res.status(200).json(await service.retrieveSession(sessionId))
}

export async function revokeSession(
  req: Request,
  res: Response
): Promise<void> {
  const { sessionId } = validParams<{ sessionId: string }>(req)

  res
    .status(200)
    .json(await service.revokeSession(sessionId, getPrincipal(req).userId))
}

export async function listUserSessions(
  req: Request,
  res: Response
): Promise<void> {
  const { userId } = validParams<{ userId: string }>(req)
  const query = validQuery<ListUserSessionsQuery>(req)

  res.status(200).json(await service.listUserSessions(userId, query))
}

export async function revokeUserSessions(
  req: Request,
  res: Response
): Promise<void> {
  const { userId } = validParams<{ userId: string }>(req)

  res
    .status(200)
    .json(await service.revokeUserSessions(userId, getPrincipal(req).userId))
}
