import type { Request, Response } from 'express'

import { getError, isError, type Error as WorkErrorValue } from '@876/core'
import { getPrincipal } from '../../http/auth/principal.js'
import {
  sendWorkError,
  sendWorkList,
  sendWorkResult,
} from '../../http/result.js'
import * as account from './sync-account.service.js'
import * as run from './sync-run.service.js'
import * as service from './sync-connections.service.js'
import {
  calendarLinkParamsSchema,
  connectionParamsSchema,
  createConnectionBodySchema,
  linkCalendarBodySchema,
  listConnectionsQuerySchema,
  organizationParamsSchema,
  setupConnectionBodySchema,
  updateConnectionBodySchema,
} from './sync-connections.schemas.js'

function sessionUser(req: Request) {
  const principal = getPrincipal(req)
  return principal.kind === 'session' ? principal.userId : null
}

function requireSessionUser(req: Request): string | WorkErrorValue {
  const userId = sessionUser(req)
  if (!userId) return getError('work/session-forbidden')
  return userId
}

export async function listConnections(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const q = listConnectionsQuerySchema.parse(req.query)
  const actingUserId = sessionUser(req)
  return sendWorkList(
    res,
    await service.list(organizationId, {
      ...(actingUserId
        ? { userId: actingUserId }
        : q.user_id
          ? { userId: q.user_id }
          : {}),
      ...(q.provider ? { provider: q.provider } : {}),
      ...(q.status ? { status: q.status } : {}),
      limit: q.limit,
      ...(q.starting_after ? { startingAfter: q.starting_after } : {}),
      ...(q.ending_before ? { endingBefore: q.ending_before } : {}),
    }),
    `/v1/organizations/${organizationId}/sync-connections`
  )
}

export async function retrieveConnection(req: Request, res: Response) {
  const { organizationId, connectionId } = connectionParamsSchema.parse(
    req.params
  )
  const result = await service.retrieve(organizationId, connectionId)
  if (!result) return sendWorkError(res, 'work/sync-connection-not-found')
  const actingUserId = sessionUser(req)
  if (
    actingUserId &&
    !('httpStatus' in result) &&
    result.userId !== actingUserId
  )
    return sendWorkError(res, 'work/sync-connection-not-found')
  return sendWorkResult(res, result)
}

/** Generic connection creation is integration-tier only. Session callers use setup. */
export async function createConnection(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendWorkResult(
    res,
    await service.create(
      organizationId,
      createConnectionBodySchema.parse(req.body)
    ),
    201
  )
}

/** Generic connection mutation is integration-tier only. */
export async function updateConnection(req: Request, res: Response) {
  const { organizationId, connectionId } = connectionParamsSchema.parse(
    req.params
  )
  const result = await service.update(
    organizationId,
    connectionId,
    updateConnectionBodySchema.parse(req.body)
  )
  if (!result) return sendWorkError(res, 'work/sync-connection-not-found')
  return sendWorkResult(res, result)
}

export async function deleteConnection(req: Request, res: Response) {
  const { organizationId, connectionId } = connectionParamsSchema.parse(
    req.params
  )
  const actingUserId = sessionUser(req)
  if (actingUserId) {
    const current = await service.retrieve(organizationId, connectionId)
    if (!current || 'httpStatus' in current || current.userId !== actingUserId)
      return sendWorkError(res, 'work/sync-connection-not-found')
  }
  const result = await service.remove(organizationId, connectionId)
  if (!result) return sendWorkError(res, 'work/sync-connection-not-found')
  return sendWorkResult(res, result)
}

export async function setupConnection(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const actingUserId = requireSessionUser(req)
  if (isError(actingUserId)) return sendWorkResult(res, actingUserId)
  return sendWorkResult(
    res,
    await account.setup(
      organizationId,
      actingUserId,
      setupConnectionBodySchema.parse(req.body)
    ),
    201
  )
}

export async function authorizeConnection(req: Request, res: Response) {
  const { organizationId, connectionId } = connectionParamsSchema.parse(
    req.params
  )
  const actingUserId = requireSessionUser(req)
  if (isError(actingUserId)) return sendWorkResult(res, actingUserId)
  return sendWorkResult(
    res,
    await account.authorize(organizationId, connectionId, actingUserId)
  )
}

export async function listRemoteCalendars(req: Request, res: Response) {
  const { organizationId, connectionId } = connectionParamsSchema.parse(
    req.params
  )
  const actingUserId = requireSessionUser(req)
  if (isError(actingUserId)) return sendWorkResult(res, actingUserId)
  const result = await account.remoteCalendars(
    organizationId,
    connectionId,
    actingUserId
  )
  if ('httpStatus' in result) return sendWorkResult(res, result)
  return sendWorkList(
    res,
    { data: result, hasMore: false },
    `/v1/organizations/${organizationId}/sync-connections/${connectionId}/remote-calendars`
  )
}

export async function listCalendarLinks(req: Request, res: Response) {
  const { organizationId, connectionId } = connectionParamsSchema.parse(
    req.params
  )
  const actingUserId = requireSessionUser(req)
  if (isError(actingUserId)) return sendWorkResult(res, actingUserId)
  const result = await account.listLinks(
    organizationId,
    connectionId,
    actingUserId
  )
  if ('httpStatus' in result) return sendWorkResult(res, result)
  return sendWorkList(
    res,
    { data: result, hasMore: false },
    `/v1/organizations/${organizationId}/sync-connections/${connectionId}/calendar-links`
  )
}

export async function linkCalendar(req: Request, res: Response) {
  const { organizationId, connectionId } = connectionParamsSchema.parse(
    req.params
  )
  const actingUserId = requireSessionUser(req)
  if (isError(actingUserId)) return sendWorkResult(res, actingUserId)
  return sendWorkResult(
    res,
    await account.linkCalendar(
      organizationId,
      connectionId,
      actingUserId,
      linkCalendarBodySchema.parse(req.body)
    ),
    201
  )
}

export async function unlinkCalendar(req: Request, res: Response) {
  const { organizationId, connectionId, mappingId } =
    calendarLinkParamsSchema.parse(req.params)
  const actingUserId = requireSessionUser(req)
  if (isError(actingUserId)) return sendWorkResult(res, actingUserId)
  return sendWorkResult(
    res,
    await account.unlinkCalendar(
      organizationId,
      connectionId,
      mappingId,
      actingUserId
    )
  )
}

export async function syncConnection(req: Request, res: Response) {
  const { organizationId, connectionId } = connectionParamsSchema.parse(
    req.params
  )
  const principal = getPrincipal(req)
  if (principal.kind === 'session') {
    const actingUserId = requireSessionUser(req)
    if (isError(actingUserId)) return sendWorkResult(res, actingUserId)
    return sendWorkResult(
      res,
      await run.syncConnection(organizationId, connectionId, actingUserId)
    )
  }
  return sendWorkResult(
    res,
    await run.syncConnection(organizationId, connectionId, undefined)
  )
}

export async function syncCalendarLink(req: Request, res: Response) {
  const { organizationId, connectionId, mappingId } =
    calendarLinkParamsSchema.parse(req.params)
  const principal = getPrincipal(req)
  if (principal.kind === 'session') {
    const actingUserId = requireSessionUser(req)
    if (isError(actingUserId)) return sendWorkResult(res, actingUserId)
    return sendWorkResult(
      res,
      await run.syncCalendarLink(
        organizationId,
        connectionId,
        mappingId,
        actingUserId
      )
    )
  }
  return sendWorkResult(
    res,
    await run.syncCalendarLink(
      organizationId,
      connectionId,
      mappingId,
      undefined
    )
  )
}
