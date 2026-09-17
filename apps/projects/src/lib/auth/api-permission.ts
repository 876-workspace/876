import 'server-only'

import { apiJson } from '@876/core/api'
import type { AccessContext } from '@876/core/access'

import {
  canAccess,
  canAccessModule,
  resolveAccessContext,
} from './access-context'
import { getProjectsApiContext } from './api-context'

import type { ApiContext } from '@/types/access'

type ResolvedApiAccess =
  | {
      response: Response
      context?: undefined
      orgId?: undefined
      userId?: undefined
    }
  | {
      response: null
      context: AccessContext
      orgId: string
      userId: string
    }

async function resolveApiAccess(): Promise<ResolvedApiAccess> {
  const context = await getProjectsApiContext()
  if (!context)
    return {
      response: apiJson({ error: 'Unauthorized.' }, { status: 401 }),
    }

  const outcome = await resolveAccessContext(context.userId, context.orgId)
  if (outcome.status === 'unavailable')
    return {
      response: apiJson(
        { error: 'Access could not be verified. Try again shortly.' },
        { status: 503 }
      ),
    }

  return {
    response: null,
    context: outcome.context,
    orgId: context.orgId,
    userId: context.userId,
  }
}

/**
 * Authorizes a route handler before it touches the owning client.
 *
 * A route handler answers with a status, it never redirects: redirecting an API
 * authorization failure unmounts the app chrome and hides the real outcome from
 * the caller (`.claude/rules/access-control.md`). An outage is reported as 503
 * rather than 403, so a provider failure is not presented to the user as a
 * denial.
 */
export async function requireApiPermission(
  permission: string
): Promise<ApiContext> {
  const access = await resolveApiAccess()
  if (access.response) return access

  if (!canAccess(access.context, permission))
    return {
      response: apiJson({ error: 'Forbidden.' }, { status: 403 }),
    }

  return { response: null, orgId: access.orgId, userId: access.userId }
}

/** Requires both a commercial module entitlement and a user permission. */
export async function requireApiAccess(requirement: {
  module: string
  permission: string
}): Promise<ApiContext> {
  const access = await resolveApiAccess()
  if (access.response) return access

  if (!canAccessModule(access.context, requirement.module))
    return {
      response: apiJson({ error: 'Forbidden.' }, { status: 403 }),
    }

  if (!canAccess(access.context, requirement.permission))
    return {
      response: apiJson({ error: 'Forbidden.' }, { status: 403 }),
    }

  return { response: null, orgId: access.orgId, userId: access.userId }
}
