import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { getError, isError, type Error as WorkErrorValue } from '@876/core'
import type { WorkSecurity, GuardResolver } from '../api-router.js'
import { sendWorkResult } from '../result.js'
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
  handler: (
    req: Request
  ) => Promise<WorkPrincipal | WorkErrorValue> | WorkPrincipal | WorkErrorValue
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req)).then((result) => {
      if (isError(result)) return sendWorkResult(res, result)
      setPrincipal(req, result)
      next()
    }, next)
  }
}
function singleCredential(req: Request): Credential | WorkErrorValue {
  const credentials = readCredentials(req)
  if (credentials.length !== 1) return getError('work/unauthorized')
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
function internalPrincipal(req: Request): WorkPrincipal | WorkErrorValue {
  const credential = singleCredential(req)
  if (isError(credential)) return credential
  const configured = process.env.WORK_INTERNAL_KEY
  if (
    credential.kind !== 'internal' ||
    !configured ||
    !secretsMatch(credential.value, configured)
  )
    return getError('work/unauthorized')
  return { ...basePrincipal('internal'), platformAdmin: true }
}
function schedulerPrincipal(req: Request): WorkPrincipal | WorkErrorValue {
  const token = readBearerToken(req)
  const configured = process.env.WORK_CRON_SECRET
  if (!token || !configured || !secretsMatch(token, configured))
    return getError('work/unauthorized')
  return basePrincipal('scheduler')
}
async function activeTenant(
  repository: AuthRepository,
  organizationId: string
): Promise<TenantAuthorization | WorkErrorValue> {
  const tenant = await repository.tenantByOrganizationId(organizationId)
  if (!tenant?.active) return getError('work/tenant-not-found')
  return tenant
}
function organizationIdFrom(req: Request): string | WorkErrorValue {
  const raw = req.params.organizationId
  const organizationId = Array.isArray(raw) ? raw[0] : raw
  if (!organizationId) return getError('work/invalid-request')
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
        if (isError(organizationId)) return organizationId
        const credential = singleCredential(req)
        if (isError(credential)) return credential
        if (credential.kind === 'internal') {
          const internal = internalPrincipal(req)
          if (isError(internal)) return internal
          const tenant = await activeTenant(options.repository, organizationId)
          if (isError(tenant)) return tenant
          return { ...internal, tenantId: tenant.id, organizationId }
        }
        let app
        try {
          app = await options.identity.appForApiKey(credential.value)
        } catch (error) {
          if (error instanceof IdentityUnavailableError)
            return getError('work/identity-unavailable')
          throw error
        }
        if (!app) return getError('work/invalid-api-key')
        const tenant = await activeTenant(options.repository, organizationId)
        if (isError(tenant)) return tenant
        const accessToken = readBearerToken(req)
        if (accessToken) {
          if (!security.sessionPermissions?.length)
            return getError('work/session-forbidden')
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
              return getError('work/identity-unavailable')
            throw error
          }
          if (!access) return getError('work/session-forbidden')

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
            return getError('work/session-forbidden')
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
          return getError('work/connection-forbidden')
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
