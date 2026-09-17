import type { NextFunction, Request, RequestHandler, Response } from 'express'

import { resolveSessionAccess } from '../platform/session-access.js'
import {
  SessionIdentityUnavailable,
  verifySessionToken,
} from '../platform/session-verifier.js'
import { secretsMatch } from './internal-auth.js'
import { sendProjectsError } from './result.js'

export type SessionRequirement = {
  permission: string
  module?: string
}

export type SessionPrincipal = {
  userId: string
  organizationId: string
  permissions: string[]
  modules: string[]
}

const SESSION_KEY = 'session'

export function getSessionPrincipal(res: Response): SessionPrincipal | null {
  const principal = (res.locals as Record<string, unknown>)[SESSION_KEY]
  if (!principal || typeof principal !== 'object') return null
  const candidate = principal as Partial<SessionPrincipal>
  if (typeof candidate.userId !== 'string') return null
  return candidate as SessionPrincipal
}

export function getSessionUserId(res: Response): string | null {
  return getSessionPrincipal(res)?.userId ?? null
}

function readBearerToken(req: Request): string | null {
  const authorization = req.header('authorization') ?? ''
  if (!authorization.toLowerCase().startsWith('bearer ')) return null
  const token = authorization.slice('Bearer '.length).trim()
  return token || null
}

/**
 * Session-tier guard for the native mobile client. Verifies the Core-issued
 * bearer, binds the token organization to the path organization, resolves the
 * caller's app access from Core, and enforces one exact module/permission
 * pair mirrored from the web BFF's `requireApiAccess` requirement.
 *
 * On the session path any client-supplied `x-actor-permissions` value is
 * untrusted, so the guard replaces it with the Core-resolved permission set
 * that downstream `mutationContext` readers already consume.
 */
export function requireSessionAccess(
  requirement: SessionRequirement
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = readBearerToken(req)
      if (!token) return sendProjectsError(res, 'projects/unauthorized')

      const verified = await verifySessionToken(token)
      if (!verified) return sendProjectsError(res, 'projects/unauthorized')

      const { organizationId } = req.params as {
        organizationId?: string
      }
      if (!organizationId || verified.organizationId !== organizationId)
        return sendProjectsError(res, 'projects/forbidden')

      const outcome = await resolveSessionAccess({
        token,
        userId: verified.userId,
        organizationId,
      })
      if (outcome.status === 'unavailable')
        return sendProjectsError(res, 'projects/identity-unavailable')
      if (outcome.status === 'denied')
        return sendProjectsError(res, 'projects/forbidden')

      const { access } = outcome
      if (requirement.module && !access.modules.includes(requirement.module))
        return sendProjectsError(res, 'projects/forbidden')
      if (!access.permissions.includes(requirement.permission))
        return sendProjectsError(res, 'projects/forbidden')

      res.locals[SESSION_KEY] = {
        userId: access.userId,
        organizationId: access.organizationId,
        permissions: access.permissions,
        modules: access.modules,
      } satisfies SessionPrincipal
      req.headers['x-actor-permissions'] = access.permissions.join(',')

      next()
    } catch (error) {
      if (error instanceof SessionIdentityUnavailable)
        return sendProjectsError(res, 'projects/identity-unavailable')
      next(error)
    }
  }
}

/**
 * Accepts the existing internal credential or a verified user session on one
 * route. A presented internal key must be valid — an invalid key never falls
 * through to session handling, so a misconfigured first-party caller stays
 * loud instead of silently changing authority. Internal callers keep
 * attesting their actor through `x-actor-permissions` as before.
 */
export function requireInternalKeyOrSession(
  requirement: SessionRequirement
): RequestHandler {
  const session = requireSessionAccess(requirement)
  return (req: Request, res: Response, next: NextFunction) => {
    const provided = req.header('x-internal-key')?.trim()
    if (!provided) return session(req, res, next)

    const expected = process.env.PROJECTS_INTERNAL_KEY
    if (!expected || !secretsMatch(provided, expected))
      return sendProjectsError(res, 'projects/unauthorized')

    next()
  }
}
