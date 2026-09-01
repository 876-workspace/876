import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

import { getSettings } from '@/config'
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
  accountingProviderError,
  toAccountingProviderHttpError,
} from './accounting-provider-errors'
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

async function tenantIdForOrganization(organizationId: string) {
  const tenant = await tenantAuthorizationByOrganizationId(organizationId)
  if (!tenant || !tenant.active)
    throw accountingProviderError('billing/workspace-not-found')
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

function normalizedAccountsDomain(value: string) {
  try {
    return normalizeZohoAccountsDomain(value)
  } catch (error) {
    throw toAccountingProviderHttpError(error)
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
    throw accountingProviderError('billing/accounting-provider-not-found')
  if (provider.key !== 'zoho-books')
    throw accountingProviderError('billing/accounting-provider-unsupported')
  const now = nowUnixSeconds()
  return serializeAccountingConnection(
    await createAccountingConnectionRow({
      tenantId,
      id: generateId('AccountingProviderConnection'),
      body,
      accountsDomain: normalizedAccountsDomain(
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
    throw accountingProviderError(
      'billing/accounting-provider-connection-not-found'
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
    throw accountingProviderError(
      'billing/accounting-provider-connection-not-found'
    )
  return serializeAccountingConnection(row)
}

function stateHash(nonce: string) {
  return createHash('sha256').update(nonce).digest('hex')
}

function requireZohoConfig() {
  const config = getSettings().zohoBooks
  if (!config.clientId || !config.clientSecret || !config.redirectUri)
    throw accountingProviderError('billing/accounting-provider-not-configured')
  return config
}

export async function authorizeAccountingConnection(
  organizationId: string,
  connectionId: string
) {
  const tenantId = await tenantIdForOrganization(organizationId)
  const row = await findAccountingConnectionRow(tenantId, connectionId)
  if (!row)
    throw accountingProviderError(
      'billing/accounting-provider-connection-not-found'
    )
  if (row.provider.key !== 'zoho-books')
    throw accountingProviderError('billing/accounting-provider-unsupported')
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

  try {
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
  } catch (error) {
    throw toAccountingProviderHttpError(error)
  }
}

function parseAndVerifyState(
  state: string,
  expectedHash: string | null,
  expiresAt: number | null
) {
  const separator = state.indexOf('.')
  if (separator <= 0 || !expectedHash || !expiresAt)
    throw accountingProviderError('billing/oauth-invalid-state')
  const nonce = state.slice(separator + 1)
  const actual = Buffer.from(stateHash(nonce), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')
  if (
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected) ||
    expiresAt < nowUnixSeconds()
  )
    throw accountingProviderError('billing/oauth-invalid-state')
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
  if (!row) throw accountingProviderError('billing/oauth-invalid-state')
  parseAndVerifyState(query.state, row.oauthStateHash, row.oauthStateExpiresAt)
  if (row.provider.key !== 'zoho-books')
    throw accountingProviderError('billing/oauth-invalid-state')

  const oauthStateHash = row.oauthStateHash
  if (
    !oauthStateHash ||
    !(await consumeAccountingOauthState({
      id: row.id,
      oauthStateHash,
      now: nowUnixSeconds(),
    }))
  )
    throw accountingProviderError('billing/oauth-invalid-state')

  try {
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
      throw accountingProviderError(
        'billing/provider-offline-authorization-required'
      )
    if (!token.api_domain)
      throw accountingProviderError('billing/provider-invalid-response')

    const organizations = await listZohoBooksOrganizations({
      apiDomain: token.api_domain,
      accessToken: token.access_token,
    })
    const selected =
      organizations.find((organization) => organization.is_default_org) ??
      organizations.find(
        (organization) => organization.is_org_active !== false
      ) ??
      organizations[0]
    if (!selected)
      throw accountingProviderError('billing/provider-organization-not-found')

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
  } catch (error) {
    throw toAccountingProviderHttpError(error)
  }
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
      message: 'The accounting provider authorization must be renewed.',
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
    throw accountingProviderError(
      'billing/accounting-provider-connection-not-found'
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
          'The configured accounting provider organization is not available.',
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
    throw toAccountingProviderHttpError(caught)
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
    throw accountingProviderError(
      'billing/accounting-provider-connection-not-found'
    )
  return {
    object: 'accounting-provider-connection' as const,
    id: connectionId,
    deleted: true as const,
  }
}
