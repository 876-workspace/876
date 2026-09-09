import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { WorkSecurity, GuardResolver } from '../api-router.js'
import { WorkHttpError } from '../work-http-error.js'
import {
  readBearerToken,
  readCredentials,
  secretsMatch,
  type Credential,
} from './credentials.js'
import { IdentityUnavailableError, type IdentityGateway } from './identity.js'
import { setPrincipal, type WorkPrincipal } from './principal.js'
export type TenantAuthorization = { id: string; active: boolean }
export type ConnectionAuthorization = { scopes: ReadonlySet<string> }
export type AuthRepository = {
  tenantByOrganizationId(
    organizationId: string
  ): Promise<TenantAuthorization | null>
  activeConnection(
    tenantId: string,
    appId: string
  ): Promise<ConnectionAuthorization | null>
}
function middleware(
  handler: (req: Request) => Promise<WorkPrincipal> | WorkPrincipal
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    Promise.resolve(handler(req)).then((principal) => {
      setPrincipal(req, principal)
      next()
    }, next)
  }
}
function singleCredential(req: Request): Credential {
  const credentials = readCredentials(req)
  if (credentials.length !== 1) throw new WorkHttpError('work/unauthorized')
  return credentials[0]!
}
function basePrincipal(kind: WorkPrincipal['kind']): WorkPrincipal {
  return {
    kind,
    tenantId: null,
    organizationId: null,
    appId: null,
    userId: null,
    scopes: new Set(),
    permissions: new Set(),
    platformAdmin: false,
  }
}
function internalPrincipal(req: Request): WorkPrincipal {
  const credential = singleCredential(req)
  const configured = process.env.WORK_INTERNAL_KEY
  if (
    credential.kind !== 'internal' ||
    !configured ||
    !secretsMatch(credential.value, configured)
  )
    throw new WorkHttpError('work/unauthorized')
  return { ...basePrincipal('internal'), platformAdmin: true }
}
function schedulerPrincipal(req: Request): WorkPrincipal {
  const token = readBearerToken(req)
  const configured = process.env.WORK_CRON_SECRET
  if (!token || !configured || !secretsMatch(token, configured))
    throw new WorkHttpError('work/unauthorized')
  return basePrincipal('scheduler')
}
async function activeTenant(
  repository: AuthRepository,
  organizationId: string
): Promise<TenantAuthorization> {
  const tenant = await repository.tenantByOrganizationId(organizationId)
  if (!tenant?.active) throw new WorkHttpError('work/tenant-not-found')
  return tenant
}
function organizationIdFrom(req: Request) {
  const raw = req.params.organizationId
  const organizationId = Array.isArray(raw) ? raw[0] : raw
  if (!organizationId) throw new WorkHttpError('work/invalid-request')
  return organizationId
}
export function createGuardResolver(options: {
  repository: AuthRepository
  identity: IdentityGateway
}): GuardResolver {
  return (security: WorkSecurity) => {
    if (security.kind === 'operator') return [middleware(internalPrincipal)]
    if (security.kind === 'scheduler') return [middleware(schedulerPrincipal)]
    return [
      middleware(async (req) => {
        const organizationId = organizationIdFrom(req)
        const credential = singleCredential(req)
        if (credential.kind === 'internal') {
          const internal = internalPrincipal(req)
          const tenant = await activeTenant(options.repository, organizationId)
          return { ...internal, tenantId: tenant.id, organizationId }
        }
        let app
        try {
          app = await options.identity.appForApiKey(credential.value)
        } catch (error) {
          if (error instanceof IdentityUnavailableError)
            throw new WorkHttpError('work/identity-unavailable')
          throw error
        }
        if (!app) throw new WorkHttpError('work/invalid-api-key')
        const tenant = await activeTenant(options.repository, organizationId)
        const accessToken = readBearerToken(req)
        if (accessToken) {
          if (!security.sessionPermissions?.length)
            throw new WorkHttpError('work/session-forbidden')
          let access
          try {
            access = await options.identity.sessionAccess({
              apiKey: credential.value,
              accessToken,
              organizationId,
              appId: app.id,
            })
          } catch (error) {
            if (error instanceof IdentityUnavailableError)
              throw new WorkHttpError('work/identity-unavailable')
            throw error
          }
          if (!access) throw new WorkHttpError('work/session-forbidden')

          const permissionsRequired = security.sessionPermissions ?? []
          const allowed =
            security.sessionPermissionsMode === 'all'
              ? permissionsRequired.every((permission) =>
                  access.effectivePermissions.has(permission)
                )
              : permissionsRequired.some((permission) =>
                  access.effectivePermissions.has(permission)
                )
          if (
            !access.assigned ||
            !access.entitled ||
            access.status !== 'ACTIVE' ||
            !allowed
          )
            throw new WorkHttpError('work/session-forbidden')
          return {
            kind: 'session',
            tenantId: tenant.id,
            organizationId,
            appId: app.id,
            userId: access.userId,
            scopes: new Set<string>(),
            permissions: access.effectivePermissions,
            platformAdmin: false,
          }
        }
        const connection = await options.repository.activeConnection(
          tenant.id,
          app.id
        )
        if (!connection?.scopes.has(security.scope))
          throw new WorkHttpError('work/connection-forbidden')
        return {
          kind: 'app_api_key',
          tenantId: tenant.id,
          organizationId,
          appId: app.id,
          userId: null,
          scopes: connection.scopes,
          permissions: new Set<string>(),
          platformAdmin: false,
        }
      }),
    ]
  }
}
