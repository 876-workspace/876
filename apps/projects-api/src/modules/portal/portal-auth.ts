import type { NextFunction, Request, Response } from 'express'

import { secretsMatch } from '../../http/internal-auth.js'
import { getError } from '../../http/errors.js'
import { toClientError } from '../../http/result.js'
import * as projects from '../projects/index.js'
import * as tenants from '../tenants/index.js'
import type { ProjectRow } from '../projects/projects.serializers.js'
import * as grants from './client-grants.repository.js'
import type { ClientGrantRow } from './client-grants.serializers.js'

export type PortalContext = {
  organizationId: string
  tenantId: string
  project: ProjectRow
  grant: ClientGrantRow
  portalUserId: string
}

function unauthorized(res: Response) {
  const error = getError('projects/unauthorized')
  return res
    .status(error.httpStatus)
    .json({ data: null, error: toClientError(error) })
}

function grantNotFound(res: Response) {
  const error = getError('projects/client-grant-not-found')
  return res
    .status(error.httpStatus)
    .json({ data: null, error: toClientError(error) })
}

/**
 * Session-tier portal guard. The app calls portal routes with the internal
 * key plus the acting user's id; this guard resolves the unrevoked client
 * grant for (tenant, project, user). Anything without a live grant reads
 * as 404 so grant existence never leaks across tenants, projects, or users.
 */
export async function requirePortalGrant(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const expected = process.env.PROJECTS_INTERNAL_KEY
  const provided = req.header('x-internal-key')?.trim()
  if (!expected || !provided || !secretsMatch(provided, expected))
    return unauthorized(res)

  const portalUserId = req.header('x-user-id')?.trim()
  if (!portalUserId) return unauthorized(res)

  const { organizationId, projectId } = req.params as {
    organizationId?: string
    projectId?: string
  }
  if (!organizationId || !projectId) return grantNotFound(res)

  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant) return grantNotFound(res)

  const project = await projects.resolveProject(tenant.id, projectId)
  if (!project) return grantNotFound(res)

  const grant = await grants.resolveActiveGrant(
    tenant.id,
    project.id,
    portalUserId
  )
  if (!grant) return grantNotFound(res)

  res.locals.portal = {
    organizationId,
    tenantId: tenant.id,
    project,
    grant,
    portalUserId,
  } satisfies PortalContext

  next()
}

export function portalContext(res: Response): PortalContext {
  return res.locals.portal as PortalContext
}

export type PortalScopeInput = {
  organizationId: string
  tenantId: string
  projectId: string
  grant: ClientGrantRow
  portalUserId: string
}

export function portalScope(context: PortalContext): PortalScopeInput {
  return {
    organizationId: context.organizationId,
    tenantId: context.tenantId,
    projectId: context.project.id,
    grant: context.grant,
    portalUserId: context.portalUserId,
  }
}
