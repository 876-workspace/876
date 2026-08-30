import type { NextFunction, Request, RequestHandler, Response } from 'express'

import type { WorkSecurity, GuardResolver } from '../api-router.js'
import { WorkHttpError } from '../work-http-error.js'
import {
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

function internalPrincipal(req: Request): WorkPrincipal {
  const credential = singleCredential(req)
  const configured = process.env.WORK_INTERNAL_KEY
  if (
    credential.kind !== 'internal' ||
    !configured ||
    !secretsMatch(credential.value, configured)
  )
    throw new WorkHttpError('work/unauthorized')

  return {
    kind: 'internal',
    tenantId: null,
    organizationId: null,
    appId: null,
    scopes: new Set(),
    platformAdmin: true,
  }
}

async function activeTenant(
  repository: AuthRepository,
  organizationId: string
): Promise<TenantAuthorization> {
  const tenant = await repository.tenantByOrganizationId(organizationId)
  if (!tenant?.active) throw new WorkHttpError('work/tenant-not-found')
  return tenant
}

export function createGuardResolver(options: {
  repository: AuthRepository
  identity: IdentityGateway
}): GuardResolver {
  return (security: WorkSecurity) => {
    if (security.kind === 'operator') return [middleware(internalPrincipal)]

    return [
      middleware(async (req) => {
        const rawOrganizationId = req.params.organizationId
        const organizationId = Array.isArray(rawOrganizationId)
          ? rawOrganizationId[0]
          : rawOrganizationId
        if (!organizationId) throw new WorkHttpError('work/invalid-request')

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
          scopes: connection.scopes,
          platformAdmin: false,
        }
      }),
    ]
  }
}
