import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

import { getSettings } from '@/config'
import { AppHttpError } from '@/http/errors'
import { tenantAuthorizationByOrganizationId } from '@/modules/tenants'
import { generateId } from '@/platform/ids'
import { getSecureFieldProvider } from '@/platform/secure-field'
import { nowUnixSeconds } from '@/platform/timestamps'
import {
  ZOHO_BOOKS_SCOPES,
  buildZohoBooksAuthorizeUrl,
  exchangeZohoBooksCode,
  listZohoBooksOrganizations,
  normalizeZohoAccountsDomain,
  refreshZohoBooksToken,
  ZohoBooksError,
} from '@/providers/accounting/zoho-books/oauth-internal'
import { getVaultClient } from '@/providers/workos/vault'

import {
  completeAccountingOauth,
  consumeAccountingOauthState,
  createAccountingConnectionRow,
  disableAccountingConnectionRow,
  findAccountingConnectionById,
  findAccountingConnectionRow,
  findActiveAccountingProviderRow,
  listAccountingConnectionRows,
  listAccountingProviderRows,
  markAccountingConnectionError,
  markAccountingConnectionHealthy,
  setAccountingOauthState,
  updateAccountingConnectionRow,
} from './accounting-providers.repository'
import type {
  AccountingConnectionCreateBody,
  AccountingConnectionUpdateBody,
  ZohoOauthCallbackQuery,
} from './accounting-providers.schemas'
import {
  serializeAccountingConnection,
  serializeAccountingProvider,
} from './accounting-providers.serializers'

function error(code: string, message: string, httpStatus: number) {
  return new AppHttpError({ code, message, httpStatus })
}

async function tenantIdForOrganization(organizationId: string) {
  const tenant = await tenantAuthorizationByOrganizationId(organizationId)
  if (!tenant || !tenant.active)
    throw error(
      'billing/workspace-not-found',
      'The Billing workspace was not found.',
      404
    )
  return tenant.id
}

function list<T>(data: T[], url: string) {
  return {
    object: 'list' as const,
    data,
    has_more: false,
    total_count: data.length,
    url,
  }
}

export async function listAccountingProviders() {
  return list(
    (await listAccountingProviderRows()).map(serializeAccountingProvider),
    '/api/v1/admin/accounting-providers'
  )
}

export async function listAccountingConnections(organizationId: string) {
  const tenantId = await tenantIdForOrganization(organizationId)
  return list(
    (await listAccountingConnectionRows(tenantId)).map(
      serializeAccountingConnection
    ),
    `/api/v1/admin/organizations/${organizationId}/accounting-provider-connections`
  )
}

export async function createAccountingConnection(
  organizationId: string,
  body: AccountingConnectionCreateBody
) {
  const tenantId = await tenantIdForOrganization(organizationId)
  const provider = await findActiveAccountingProviderRow(body.providerId)
  if (!provider)
    throw error(
      'billing/accounting-provider-not-found',
      'Accounting provider not found.',
      404
    )
  if (provider.key !== 'zoho-books')
    throw error(
      'billing/accounting-provider-unsupported',
      'This accounting provider is not available yet.',
      422
    )
  const now = nowUnixSeconds()
  return serializeAccountingConnection(
    await createAccountingConnectionRow({
      tenantId,
      id: generateId('AccountingProviderConnection'),
      body,
      accountsDomain: normalizeZohoAccountsDomain(
        getSettings().zohoBooks.accountsDomain
      ),
      now,
    })
  )
}

export async function retrieveAccountingConnection(
  organizationId: string,
  connectionId: string
) {
  const tenantId = await tenantIdForOrganization(organizationId)
  const row = await findAccountingConnectionRow(tenantId, connectionId)
  if (!row)
    throw error(
      'billing/accounting-provider-connection-not-found',
      'Accounting provider connection not found.',
      404
    )
  return serializeAccountingConnection(row)
}

export async function updateAccountingConnection(
  organizationId: string,
  connectionId: string,
  body: AccountingConnectionUpdateBody
) {
  const tenantId = await tenantIdForOrganization(organizationId)
  const row = await updateAccountingConnectionRow(
    tenantId,
    connectionId,
    body,
    nowUnixSeconds()
  )
  if (!row)
    throw error(
      'billing/accounting-provider-connection-not-found',
      'Accounting provider connection not found.',
      404
    )
  return serializeAccountingConnection(row)
}

function stateHash(nonce: string) {
  return createHash('sha256').update(nonce).digest('hex')
}

function requireZohoConfig() {
  const config = getSettings().zohoBooks
  if (!config.clientId || !config.clientSecret || !config.redirectUri)
    throw error(
      'billing/accounting-provider-not-configured',
      'Zoho Books OAuth is not configured.',
      503
    )
  return config
}

export async function authorizeAccountingConnection(
  organizationId: string,
  connectionId: string
) {
  const tenantId = await tenantIdForOrganization(organizationId)
  const row = await findAccountingConnectionRow(tenantId, connectionId)
  if (!row)
    throw error(
      'billing/accounting-provider-connection-not-found',
      'Accounting provider connection not found.',
      404
    )
  if (row.provider.key !== 'zoho-books')
    throw error(
      'billing/accounting-provider-unsupported',
      'This accounting provider is not available yet.',
      422
    )
  const config = requireZohoConfig()
  const nonce = randomBytes(32).toString('base64url')
  const state = `${row.id}.${nonce}`
  const now = nowUnixSeconds()
  const expiresAt = now + 10 * 60
  await setAccountingOauthState({
    tenantId,
    id: row.id,
    oauthStateHash: stateHash(nonce),
    oauthStateExpiresAt: expiresAt,
    now,
  })
  return {
    object: 'accounting-provider-authorization' as const,
    connectionId: row.id,
    authorizeUrl: buildZohoBooksAuthorizeUrl({
      accountsDomain: row.accountsDomain ?? config.accountsDomain,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      state,
    }),
    expiresAt,
  }
}

function parseAndVerifyState(
  state: string,
  expectedHash: string | null,
  expiresAt: number | null
) {
  const separator = state.indexOf('.')
  if (separator <= 0 || !expectedHash || !expiresAt)
    throw error('billing/oauth-invalid-state', 'OAuth state is invalid.', 400)
  const nonce = state.slice(separator + 1)
  const actual = Buffer.from(stateHash(nonce), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')
  if (
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected) ||
    expiresAt < nowUnixSeconds()
  )
    throw error('billing/oauth-invalid-state', 'OAuth state is invalid.', 400)
  return state.slice(0, separator)
}

function refreshTokenContext(row: { tenantId: string; id: string }) {
  return {
    tenant_id: row.tenantId,
    accounting_provider_connection_id: row.id,
    provider: 'zoho-books',
    type: 'oauth_refresh_token',
  }
}

export async function completeZohoOauth(query: ZohoOauthCallbackQuery) {
  const connectionId = query.state.split('.', 1)[0] ?? ''
  const row = await findAccountingConnectionById(connectionId)
  if (!row)
    throw error('billing/oauth-invalid-state', 'OAuth state is invalid.', 400)
  parseAndVerifyState(query.state, row.oauthStateHash, row.oauthStateExpiresAt)
  if (row.provider.key !== 'zoho-books')
    throw error('billing/oauth-invalid-state', 'OAuth state is invalid.', 400)

  const oauthStateHash = row.oauthStateHash
  if (
    !oauthStateHash ||
    !(await consumeAccountingOauthState({
      id: row.id,
      oauthStateHash,
      now: nowUnixSeconds(),
    }))
  )
    throw error('billing/oauth-invalid-state', 'OAuth state is invalid.', 400)

  const config = requireZohoConfig()
  const accountsDomain = normalizeZohoAccountsDomain(
    query['accounts-server'] ?? row.accountsDomain ?? config.accountsDomain
  )
  const token = await exchangeZohoBooksCode({
    accountsDomain,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
    code: query.code,
  })
  if (!token.refresh_token)
    throw error(
      'billing/provider-authorization-required',
      'Zoho did not return an offline refresh token. Reconnect with consent.',
      409
    )
  if (!token.api_domain)
    throw error(
      'billing/provider-invalid-response',
      'Zoho did not return an API domain.',
      502
    )

  const organizations = await listZohoBooksOrganizations({
    apiDomain: token.api_domain,
    accessToken: token.access_token,
  })
  const selected =
    organizations.find((organization) => organization.is_default_org) ??
    organizations.find((organization) => organization.is_org_active !== false) ??
    organizations[0]
  if (!selected)
    throw error(
      'billing/provider-organization-not-found',
      'No Zoho Books organization is available for this connection.',
      422
    )

  const sealed = await getSecureFieldProvider(
    row.tenantId,
    getVaultClient()
  ).seal(token.refresh_token, refreshTokenContext(row))
  const completed = await completeAccountingOauth({
    id: row.id,
    accountsDomain,
    apiDomain: token.api_domain,
    providerOrganizationId: selected.organization_id,
    scopes: [...ZOHO_BOOKS_SCOPES],
    sealedRefreshToken: sealed.ciphertext,
    refreshTokenKeyId: sealed.keyId,
    refreshTokenVaultProvider: sealed.provider,
    now: nowUnixSeconds(),
  })
  return serializeAccountingConnection(completed)
}

export async function zohoAccessContext(connectionId: string) {
  const row = await findAccountingConnectionById(connectionId)
  if (
    !row ||
    row.provider.key !== 'zoho-books' ||
    row.status !== 'active' ||
    !row.providerOrganizationId ||
    !row.apiDomain ||
    !row.accountsDomain ||
    !row.sealedRefreshToken ||
    !row.refreshTokenVaultProvider
  )
    throw new ZohoBooksError({
      code: 'billing/provider-authorization-required',
      message: 'The Zoho Books connection is not active.',
      retryable: false,
    })

  const config = requireZohoConfig()
  const refreshToken = await getSecureFieldProvider(
    row.tenantId,
    getVaultClient()
  ).unseal(
    {
      ciphertext: row.sealedRefreshToken,
      keyId: row.refreshTokenKeyId,
      provider: row.refreshTokenVaultProvider,
    },
    refreshTokenContext(row)
  )
  const token = await refreshZohoBooksToken({
    accountsDomain: row.accountsDomain,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    refreshToken,
  })
  return {
    row,
    ctx: {
      tenantId: row.tenantId,
      connectionId: row.id,
      providerOrganizationId: row.providerOrganizationId,
      apiDomain: token.api_domain ?? row.apiDomain,
      accessToken: token.access_token,
    },
  }
}

export async function validateAccountingConnection(
  organizationId: string,
  connectionId: string
) {
  const tenantId = await tenantIdForOrganization(organizationId)
  const row = await findAccountingConnectionRow(tenantId, connectionId)
  if (!row)
    throw error(
      'billing/accounting-provider-connection-not-found',
      'Accounting provider connection not found.',
      404
    )
  try {
    const { ctx } = await zohoAccessContext(connectionId)
    const organizations = await listZohoBooksOrganizations({
      apiDomain: ctx.apiDomain,
      accessToken: ctx.accessToken,
    })
    if (
      !organizations.some(
        (organization) =>
          organization.organization_id === row.providerOrganizationId
      )
    )
      throw new ZohoBooksError({
        code: 'billing/provider-organization-not-found',
        message:
          'The configured Zoho Books organization is no longer available.',
        retryable: false,
      })
    return serializeAccountingConnection(
      await markAccountingConnectionHealthy(connectionId, nowUnixSeconds())
    )
  } catch (caught) {
    const code =
      caught instanceof ZohoBooksError
        ? caught.code
        : 'billing/provider-unavailable'
    await markAccountingConnectionError(connectionId, code, nowUnixSeconds())
    throw caught
  }
}

export async function deleteAccountingConnection(
  organizationId: string,
  connectionId: string
) {
  const tenantId = await tenantIdForOrganization(organizationId)
  const result = await disableAccountingConnectionRow(
    tenantId,
    connectionId,
    nowUnixSeconds()
  )
  if (!result.count)
    throw error(
      'billing/accounting-provider-connection-not-found',
      'Accounting provider connection not found.',
      404
    )
  return {
    object: 'accounting-provider-connection' as const,
    id: connectionId,
    deleted: true as const,
  }
}
