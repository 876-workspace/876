import { errors } from '@/http/errors'
import { listObject, type ListObject } from '@/http/envelope'

import * as repository from './sessions.repository'
import type {
  ListSessionsQuery,
  ListUserSessionsQuery,
  Session,
} from './sessions.schemas'
import { serializeSession } from './sessions.serializers'

/** Sessions — the admin surface over established logins. */

export async function listSessions(
  query: ListSessionsQuery
): Promise<ListObject<Session>> {
  const { data, hasMore } = await repository.list(query, {
    userId: query.user_id,
    deviceId: query.device_id,
    active: query.active,
    status: query.status,
  })

  return listObject({
    data: data.map(serializeSession),
    hasMore,
    url: '/sessions',
  })
}

export async function listUserSessions(
  userId: string,
  query: ListUserSessionsQuery
): Promise<ListObject<Session>> {
  const { data, hasMore } = await repository.list(query, {
    userId,
    active: query.active,
    status: query.status,
  })

  return listObject({
    data: data.map(serializeSession),
    hasMore,
    url: `/users/${userId}/sessions`,
  })
}

export async function retrieveSession(sessionId: string): Promise<Session> {
  const row = await repository.findById(sessionId)
  if (!row) throw errors.notFound('session')

  return serializeSession(row)
}

/**
 * Revoke one session.
 *
 * A missing row is a 404 rather than a silent success: an admin cutting off a
 * session needs to know whether it existed.
 */
export async function revokeSession(
  sessionId: string,
  revokedBy: string | null
): Promise<{ object: 'session'; id: string; deleted: true }> {
  const row = await repository.revoke(sessionId, revokedBy)
  if (!row) throw errors.notFound('session')

  return { object: 'session', id: sessionId, deleted: true }
}

export async function revokeUserSessions(
  userId: string,
  revokedBy: string | null
): Promise<{
  object: 'session_list'
  user_id: string
  deleted: true
  revoked_count: number
}> {
  const count = await repository.revokeAllForUser(userId, revokedBy)

  return {
    object: 'session_list',
    user_id: userId,
    deleted: true,
    revoked_count: count,
  }
}
