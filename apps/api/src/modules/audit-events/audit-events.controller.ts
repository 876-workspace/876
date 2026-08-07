import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { validBody, validQuery } from '@/http/middleware/validate'

import type {
  CreateAuditEventBody,
  ListAuditEventsQuery,
} from './audit-events.schemas'
import * as service from './audit-events.service'

export async function createAuditEvent(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<CreateAuditEventBody>(req)
  // The emitting app is taken from the credential that authenticated the
  // request, never from the body — an app cannot attribute telemetry to another.
  const { appId } = getPrincipal(req)

  res.status(201).json(await service.createAuditEvent(body, appId))
}

export async function listAuditEvents(
  req: Request,
  res: Response
): Promise<void> {
  const query = validQuery<ListAuditEventsQuery>(req)

  res.status(200).json(await service.listAuditEvents(query))
}
