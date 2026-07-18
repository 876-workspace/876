import 'server-only'

import { createHash, timingSafeEqual } from 'node:crypto'
import { create876Client } from '@876/sdk'

import { apiError } from '@876/core/api'

import { getPlatformClient } from '@/lib/876/platform-client'
import { service } from '@/lib/service'

export type BillingIntegrationScope =
  | 'billing.organizations.read'
  | 'billing.customers.read'
  | 'billing.customers.write'
  | 'billing.items.read'
  | 'billing.items.write'
  | 'billing.plans.read'
  | 'billing.subscriptions.read'
  | 'billing.subscriptions.write'
  | 'billing.invoices.read'
  | 'billing.invoices.write'
  | 'billing.payments.read'
  | 'billing.payments.write'

/** Applies integration-wide response behavior exactly once per route. */
export function integrationRoute<TContext>(
  handler: (request: Request, context: TContext) => Promise<Response>
) {
  return async (request: Request, context: TContext): Promise<Response> => {
    const response = await handler(request, context)
    response.headers.set(
      'x-request-id',
      request.headers.get('x-request-id') ?? crypto.randomUUID()
    )
    return response
  }
}

type IntegrationTenant = NonNullable<
  Awaited<ReturnType<typeof service.tenants.retrieveByOrganizationId>>
>

type IntegrationConnection = NonNullable<
  Awaited<ReturnType<typeof service.financeConnections.retrieve>>
>

export type IntegrationAccess =
  | {
      tenant: IntegrationTenant
      connection: IntegrationConnection | null
      sourceAppId: string | null
      platformAdmin: boolean
      response: null
    }
  | {
      tenant: null
      connection: null
      sourceAppId: null
      platformAdmin: false
      response: Response
    }

function secretsMatch(presented: string, expected: string): boolean {
  const presentedDigest = createHash('sha256').update(presented).digest()
  const expectedDigest = createHash('sha256').update(expected).digest()

  return timingSafeEqual(presentedDigest, expectedDigest)
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null

  return authorization.slice('Bearer '.length).trim() || null
}

async function authorizeOAuth(
  request: Request,
  organizationId: string,
  requiredScope: BillingIntegrationScope
): Promise<IntegrationAccess> {
  const token = bearerToken(request)
  if (!token) return denied('An integration credential is required.', 401)

  const identity = create876Client({
    baseUrl: process.env.API_URL,
    apiKey: process.env.BILLING_API_876_KEY,
    credentials: 'omit',
  })
  const introspection = await identity.oauth.introspectToken({ token })
  if (
    introspection.error ||
    !introspection.data?.active ||
    !introspection.data.sub ||
    !introspection.data.app_id
  )
    return denied('The integration token is invalid or expired.', 401)

  const scopes = introspection.data.scope?.split(' ').filter(Boolean) ?? []
  if (!scopes.includes(requiredScope))
    return denied('The integration token lacks the required scope.', 403)

  const platform = await getPlatformClient()
  const memberships = await platform.auth.getRoutingMemberships({
    userId: introspection.data.sub,
    status: 'active',
  })
  const belongsToOrganization = memberships.data?.data.some(
    (membership) => membership.organization.id === organizationId
  )
  if (!belongsToOrganization)
    return denied('The integration cannot access this organization.', 403)

  return authorizeConnection(
    organizationId,
    introspection.data.app_id,
    requiredScope
  )
}

async function authorizeAppApiKey(
  apiKey: string,
  organizationId: string,
  requiredScope: BillingIntegrationScope
): Promise<IntegrationAccess> {
  const identity = create876Client({
    baseUrl: process.env.API_URL,
    apiKey,
    credentials: 'omit',
  })
  const app = await identity.apps.current()
  if (app.error || !app.data?.id)
    return denied('The 876 app API key is invalid.', 401)

  return authorizeConnection(organizationId, app.data.id, requiredScope)
}

/**
 * Authorizes the versioned Billing integration API for one organization.
 *
 * Console uses the server-only platform-admin key. Product apps use their own
 * 876 app key or a short-lived delegated OAuth token; both require an active
 * app finance connection with the exact operation scope.
 */
export async function requireIntegrationOrganization(
  request: Request,
  organizationId: string,
  requiredScope: BillingIntegrationScope
): Promise<IntegrationAccess> {
  const platformAdminKey = process.env.BILLING_INTERNAL_KEY
  const presentedPlatformAdminKey = request.headers
    .get('x-internal-key')
    ?.trim()
  const appApiKey = request.headers.get('x-876-api-key')?.trim()
  const token = bearerToken(request)
  const credentialCount = [presentedPlatformAdminKey, appApiKey, token].filter(
    Boolean
  ).length
  if (credentialCount === 0)
    return denied('An integration credential is required.', 401)
  if (credentialCount > 1)
    return denied('Use exactly one integration credential.', 400)

  if (presentedPlatformAdminKey) {
    if (
      !platformAdminKey ||
      !secretsMatch(presentedPlatformAdminKey, platformAdminKey)
    )
      return denied('The platform-admin credential is invalid.', 401)

    const tenant =
      await service.tenants.retrieveByOrganizationId(organizationId)
    if (!tenant || tenant.status !== 'ACTIVE')
      return denied('The Billing workspace was not found.', 404)

    return {
      tenant,
      connection: null,
      sourceAppId: null,
      platformAdmin: true,
      response: null,
    }
  }

  if (appApiKey)
    return authorizeAppApiKey(appApiKey, organizationId, requiredScope)

  return authorizeOAuth(request, organizationId, requiredScope)
}

async function authorizeConnection(
  organizationId: string,
  sourceAppId: string,
  requiredScope: BillingIntegrationScope
): Promise<IntegrationAccess> {
  const tenant = await service.tenants.retrieveByOrganizationId(organizationId)
  if (!tenant || tenant.status !== 'ACTIVE')
    return denied('The Billing workspace was not found.', 404)

  const connection = await service.financeConnections.retrieve(
    tenant.id,
    sourceAppId
  )
  if (!connection)
    return denied('This app is not connected to the finance workspace.', 403)
  if (connection.status !== 'ACTIVE')
    return denied('This app finance connection is not active.', 403)
  if (!connection.scopes.includes(requiredScope))
    return denied('The app finance connection lacks the required scope.', 403)

  return {
    tenant,
    connection,
    sourceAppId,
    platformAdmin: false,
    response: null,
  }
}

function denied(message: string, status: number): IntegrationAccess {
  return {
    tenant: null,
    connection: null,
    sourceAppId: null,
    platformAdmin: false,
    response: apiError(message, { status }),
  }
}
