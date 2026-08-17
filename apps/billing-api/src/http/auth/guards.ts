import type { NextFunction, Request, RequestHandler, Response } from 'express'

import { getSettings } from '@/config'
import type { BillingSecurity, GuardResolver } from '@/http/api-router'
import { AppHttpError, errors } from '@/http/errors'
import { bindActor, getLogger } from '@/platform/logger'
import type { IdentityGateway, OrganizationRole } from '@/providers/identity'

import {
  credentialFingerprint,
  readCredentials,
  secretsMatch,
  type Credential,
} from './credentials'
import { setPrincipal, type BillingPrincipal } from './principal'

const log = getLogger('auth')

export type TenantAuthorization = {
  id: string
  active: boolean
}

export type MemberAuthorization = {
  permissions: ReadonlySet<string>
}

export type ConnectionAuthorization = {
  scopes: ReadonlySet<string>
}

export type AuthRepository = {
  tenantByOrganizationId(
    organizationId: string
  ): Promise<TenantAuthorization | null>
  effectiveMember(
    tenantId: string,
    userId: string,
    organizationRole: OrganizationRole
  ): Promise<MemberAuthorization | null>
  activeConnection(
    tenantId: string,
    appId: string
  ): Promise<ConnectionAuthorization | null>
}

function middleware(
  handler: (req: Request) => Promise<BillingPrincipal> | BillingPrincipal
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    Promise.resolve(handler(req)).then((principal) => {
      setPrincipal(req, principal)
      bindActor({
        ...(principal.userId ? { user_id: principal.userId } : {}),
        ...(principal.appId ? { app_id: principal.appId } : {}),
        ...(principal.tenantId ? { tenant_id: principal.tenantId } : {}),
        principal_kind: principal.kind,
      })
      next()
    }, next)
  }
}

function singleCredential(req: Request): Credential {
  const credentials = readCredentials(req)
  if (credentials.length === 0) throw errors.missingCredential()
  if (credentials.length > 1) throw errors.ambiguousCredential()
  return credentials[0]!
}

function internalPrincipal(req: Request): BillingPrincipal {
  const credential = singleCredential(req)
  const configured = getSettings().internalKey
  if (!configured) {
    throw new AppHttpError({
      code: 'auth/internal-disabled',
      message: 'Internal service access is disabled.',
      httpStatus: 503,
    })
  }
  if (
    credential.kind !== 'internal' ||
    !secretsMatch(credential.value, configured)
  ) {
    log.warn(
      {
        kind: credential.kind,
        key_fp: credentialFingerprint(credential.value),
      },
      'auth.internal.rejected'
    )
    throw new AppHttpError({
      code: 'auth/invalid-internal-key',
      message: 'The internal service credential is invalid.',
      httpStatus: 401,
    })
  }
  return {
    kind: 'internal',
    tenantId: null,
    organizationId: null,
    userId: null,
    appId: null,
    scopes: new Set(),
    permissions: new Set(),
    platformAdmin: true,
  }
}

async function activeTenant(
  repository: AuthRepository,
  organizationId: string
) {
  const tenant = await repository.tenantByOrganizationId(organizationId)
  if (!tenant?.active) {
    throw new AppHttpError({
      code: 'billing/tenant-not-found',
      message: 'The Billing workspace was not found.',
      httpStatus: 404,
    })
  }
  return tenant
}

async function oauthIdentity(
  gateway: IdentityGateway,
  token: string,
  organizationId: string
): Promise<{
  active: true
  subject: string
  appId: string | null
  scopes: ReadonlySet<string>
  organizationRole: OrganizationRole
}> {
  const identity = await gateway.introspect(token)
  if (!identity.active || !identity.subject) {
    throw new AppHttpError({
      code: 'auth/invalid-token',
      message: 'The access token is invalid or expired.',
      httpStatus: 401,
    })
  }
  const membership = await gateway.organizationMembership(token, organizationId)
  if (!membership) {
    throw new AppHttpError({
      code: 'auth/organization-forbidden',
      message: 'The authenticated user cannot access this organization.',
      httpStatus: 403,
    })
  }
  return {
    ...identity,
    active: true,
    subject: identity.subject,
    organizationRole: membership.role,
  }
}

export function createGuardResolver(options: {
  repository: AuthRepository
  identity: IdentityGateway
}): GuardResolver {
  return (security: BillingSecurity) => {
    if (security.kind === 'public') return []
    if (security.kind === 'admin') return [middleware(internalPrincipal)]
    if (security.kind === 'scheduler') {
      return [
        middleware((req) => {
          const credential = singleCredential(req)
          const configured = getSettings().schedulerKey
          if (!configured) {
            throw new AppHttpError({
              code: 'auth/scheduler-disabled',
              message: 'Scheduler access is disabled.',
              httpStatus: 503,
            })
          }
          if (
            credential.kind !== 'scheduler' ||
            !secretsMatch(credential.value, configured)
          ) {
            throw new AppHttpError({
              code: 'auth/invalid-scheduler-key',
              message: 'The scheduler credential is invalid.',
              httpStatus: 401,
            })
          }
          return {
            kind: 'scheduler',
            tenantId: null,
            organizationId: null,
            userId: null,
            appId: null,
            scopes: new Set(),
            permissions: new Set(),
            platformAdmin: false,
          }
        }),
      ]
    }

    return [
      middleware(async (req) => {
        const rawOrganizationId =
          security.kind === 'integration'
            ? req.params.organizationId
            : req.header('x-billing-organization-id')?.trim()
        const organizationId = Array.isArray(rawOrganizationId)
          ? rawOrganizationId[0]
          : rawOrganizationId
        if (!organizationId) {
          throw new AppHttpError({
            code: 'billing/organization-required',
            message:
              security.kind === 'integration'
                ? 'An organization path parameter is required.'
                : 'X-Billing-Organization-Id is required.',
            httpStatus: 400,
          })
        }

        const credential = singleCredential(req)
        if (security.kind === 'integration' && credential.kind === 'internal') {
          const internal = internalPrincipal(req)
          const tenant = await activeTenant(options.repository, organizationId)
          return { ...internal, tenantId: tenant.id, organizationId }
        }

        if (
          security.kind === 'integration' &&
          credential.kind === 'app_api_key'
        ) {
          const app = await options.identity.appForApiKey(credential.value)
          if (!app) {
            throw new AppHttpError({
              code: 'auth/invalid-api-key',
              message: 'The 876 app API key is invalid.',
              httpStatus: 401,
            })
          }
          const tenant = await activeTenant(options.repository, organizationId)
          const connection = await options.repository.activeConnection(
            tenant.id,
            app.id
          )
          if (!connection?.scopes.has(security.scope)) {
            throw new AppHttpError({
              code: 'billing/connection-forbidden',
              message: 'The app finance connection lacks the required scope.',
              httpStatus: 403,
            })
          }
          return {
            kind: 'app_api_key',
            tenantId: tenant.id,
            organizationId,
            userId: null,
            appId: app.id,
            scopes: new Set(),
            permissions: new Set(),
            platformAdmin: false,
          }
        }

        if (credential.kind !== 'oauth') {
          throw new AppHttpError({
            code: 'auth/session-required',
            message: 'A delegated user access token is required.',
            httpStatus: 401,
          })
        }
        const identity = await oauthIdentity(
          options.identity,
          credential.value,
          organizationId
        )

        if (security.kind === 'organizationMember') {
          return {
            kind: 'oauth',
            tenantId: null,
            organizationId,
            userId: identity.subject,
            appId: identity.appId,
            scopes: identity.scopes,
            permissions: new Set(),
            platformAdmin: false,
          }
        }

        const tenant = await activeTenant(options.repository, organizationId)
        if (security.kind === 'integration') {
          if (!identity.appId || !identity.scopes.has(security.scope)) {
            throw new AppHttpError({
              code: 'auth/insufficient-scope',
              message: 'The integration token lacks the required scope.',
              httpStatus: 403,
            })
          }
          const connection = await options.repository.activeConnection(
            tenant.id,
            identity.appId
          )
          if (!connection?.scopes.has(security.scope)) {
            throw new AppHttpError({
              code: 'billing/connection-forbidden',
              message: 'The app finance connection lacks the required scope.',
              httpStatus: 403,
            })
          }
          return {
            kind: 'oauth',
            tenantId: tenant.id,
            organizationId,
            userId: identity.subject,
            appId: identity.appId,
            scopes: identity.scopes,
            permissions: new Set(),
            platformAdmin: false,
          }
        }

        const member = await options.repository.effectiveMember(
          tenant.id,
          identity.subject,
          identity.organizationRole
        )
        if (!member?.permissions.has(security.permission)) {
          log.warn(
            {
              organization_id: organizationId,
              tenant_id: tenant.id,
              user_id: identity.subject,
              organization_role: identity.organizationRole,
              required_permission: security.permission,
            },
            'auth.tenant.permission_denied'
          )
          throw errors.forbidden()
        }
        return {
          kind: 'oauth',
          tenantId: tenant.id,
          organizationId,
          userId: identity.subject,
          appId: identity.appId,
          scopes: identity.scopes,
          permissions: member.permissions,
          platformAdmin: false,
        }
      }),
    ]
  }
}
