import type { Request, Response } from 'express'

import { validParams, validQuery } from '@/http/middleware/validate'

import type {
  ListAuthAttemptsQuery,
  SummaryWindow,
} from './auth-attempts.schemas'
import * as service from './auth-attempts.service'

export async function retrieveSummary(
  req: Request,
  res: Response
): Promise<void> {
  const { window } = validQuery<{ window: SummaryWindow }>(req)

  res.status(200).json(await service.retrieveSummary(window))
}

export async function listAuthAttempts(
  req: Request,
  res: Response
): Promise<void> {
  const query = validQuery<ListAuthAttemptsQuery>(req)

  res.status(200).json(await service.listAuthAttempts(query))
}

export async function retrieveAuthAttempt(
  req: Request,
  res: Response
): Promise<void> {
  const { attempt_id } = validParams<{ attempt_id: string }>(req)

  res.status(200).json(await service.retrieveAuthAttempt(attempt_id))
}

export async function listUserAuthAttempts(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id } = validParams<{ user_id: string }>(req)
  const query = validQuery<ListAuthAttemptsQuery>(req)

  res.status(200).json(await service.listUserAuthAttempts(user_id, query))
}
