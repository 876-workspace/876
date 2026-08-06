import { listObject, type ListObject } from '@/http/envelope'
import { errors } from '@/http/errors'
import { nowUnixSeconds } from '@/platform/timestamps'

import * as repository from './auth-attempts.repository'
import type {
  AuthAttempt,
  AuthAttemptSummary,
  ListAuthAttemptsQuery,
  SummaryWindow,
} from './auth-attempts.schemas'
import { serializeAuthAttempt } from './auth-attempts.serializers'

/** The authentication attempt history. */

const WINDOW_SECONDS: Record<SummaryWindow, number> = {
  '24h': 86_400,
  '7d': 604_800,
  '30d': 2_592_000,
}

export async function listAuthAttempts(
  query: ListAuthAttemptsQuery
): Promise<ListObject<AuthAttempt>> {
  const { data, hasMore } = await repository.list(
    query,
    repository.buildWhere(query)
  )

  return listObject({
    data: data.map(serializeAuthAttempt),
    hasMore,
    url: '/auth-attempts',
  })
}

export async function listUserAuthAttempts(
  userId: string,
  query: ListAuthAttemptsQuery
): Promise<ListObject<AuthAttempt>> {
  const { data, hasMore } = await repository.list(
    query,
    repository.buildWhere({ user_id: userId })
  )

  return listObject({
    data: data.map(serializeAuthAttempt),
    hasMore,
    url: `/users/${userId}/auth-attempts`,
  })
}

export async function retrieveAuthAttempt(
  attemptId: string
): Promise<AuthAttempt> {
  const row = await repository.findById(attemptId)
  if (!row) throw errors.notFound('auth-attempt')

  return serializeAuthAttempt(row)
}

export async function retrieveSummary(
  window: SummaryWindow
): Promise<AuthAttemptSummary> {
  const totals = await repository.summary(
    nowUnixSeconds() - WINDOW_SECONDS[window]
  )

  return {
    object: 'auth_attempt_summary',
    window,
    total: totals.total,
    outcomes: totals.outcomes,
    top_countries: totals.topCountries,
    top_failure_codes: totals.topFailureCodes,
    top_failure_ips: totals.topFailureIps,
  }
}
