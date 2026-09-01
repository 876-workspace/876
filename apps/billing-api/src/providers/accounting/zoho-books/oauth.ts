import { z } from 'zod'

import { classifyZohoHttpError, ZohoBooksError } from './errors'

export const ZOHO_BOOKS_SCOPES = [
  'ZohoBooks.settings.READ',
  'ZohoBooks.settings.CREATE',
  'ZohoBooks.settings.UPDATE',
  'ZohoBooks.settings.DELETE',
  'ZohoBooks.contacts.READ',
  'ZohoBooks.contacts.CREATE',
  'ZohoBooks.contacts.UPDATE',
  'ZohoBooks.contacts.DELETE',
  'ZohoBooks.estimates.READ',
  'ZohoBooks.estimates.CREATE',
  'ZohoBooks.estimates.UPDATE',
  'ZohoBooks.estimates.DELETE',
  'ZohoBooks.invoices.READ',
  'ZohoBooks.invoices.CREATE',
  'ZohoBooks.invoices.UPDATE',
  'ZohoBooks.invoices.DELETE',
  'ZohoBooks.customerpayments.READ',
  'ZohoBooks.customerpayments.CREATE',
  'ZohoBooks.customerpayments.UPDATE',
  'ZohoBooks.customerpayments.DELETE',
] as const

const allowedAccountsDomains = new Set([
  'https://accounts.zoho.com',
  'https://accounts.zoho.eu',
  'https://accounts.zoho.in',
  'https://accounts.zoho.com.au',
  'https://accounts.zoho.jp',
  'https://accounts.zoho.ca',
  'https://accounts.zoho.com.cn',
  'https://accounts.zoho.sa',
])

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  api_domain: z.string().url().optional(),
  token_type: z.string().optional(),
  expires_in: z.number().int().optional(),
})

const oauthErrorSchema = z.object({ error: z.string() }).passthrough()
const organizationsResponseSchema = z
  .object({
    code: z.number(),
    message: z.string(),
    organizations: z.array(
      z
        .object({
          organization_id: z.string(),
          name: z.string(),
          is_default_org: z.boolean().optional(),
          is_org_active: z.boolean().optional(),
          currency_code: z.string().optional(),
        })
        .passthrough()
    ),
  })
  .passthrough()

export function normalizeZohoAccountsDomain(value: string): string {
  const domain = value.replace(/\/+$/, '')
  if (!allowedAccountsDomains.has(domain))
    throw new ZohoBooksError({
      code: 'billing/provider-invalid-domain',
      retryable: false,
    })
  return domain
}

function tokenUrl(accountsDomain: string) {
  return `${normalizeZohoAccountsDomain(accountsDomain)}/oauth/v2/token`
}

async function postToken(
  accountsDomain: string,
  body: URLSearchParams,
  fetchImpl: typeof fetch = fetch
) {
  let response: Response
  try {
    response = await fetchImpl(tokenUrl(accountsDomain), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
  } catch (error) {
    throw new ZohoBooksError({
      code: 'billing/provider-unavailable',
      retryable: true,
      cause: error,
    })
  }

  const raw: unknown = await response.json().catch(() => ({}))
  const oauthError = oauthErrorSchema.safeParse(raw)
  if (!response.ok || oauthError.success) {
    const providerCode = oauthError.success
      ? oauthError.data.error
      : 'oauth-error'
    if (response.status === 429 || response.status >= 500)
      throw classifyZohoHttpError(response.status, providerCode, '')
    throw new ZohoBooksError({
      code:
        providerCode === 'invalid_grant'
          ? 'billing/provider-authorization-required'
          : 'billing/provider-authentication-failed',
      httpStatus: response.status,
      retryable: false,
    })
  }

  const parsed = tokenResponseSchema.safeParse(raw)
  if (!parsed.success)
    throw new ZohoBooksError({
      code: 'billing/provider-invalid-response',
      httpStatus: response.status,
      retryable: false,
    })
  return parsed.data
}

export function buildZohoBooksAuthorizeUrl(params: {
  accountsDomain: string
  clientId: string
  redirectUri: string
  state: string
  scopes?: readonly string[]
}) {
  const url = new URL(
    `${normalizeZohoAccountsDomain(params.accountsDomain)}/oauth/v2/auth`
  )
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('scope', (params.scopes ?? ZOHO_BOOKS_SCOPES).join(','))
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', params.state)
  return url.toString()
}

export function exchangeZohoBooksCode(params: {
  accountsDomain: string
  clientId: string
  clientSecret: string
  redirectUri: string
  code: string
  fetchImpl?: typeof fetch
}) {
  return postToken(
    params.accountsDomain,
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      code: params.code,
    }),
    params.fetchImpl
  )
}

export function refreshZohoBooksToken(params: {
  accountsDomain: string
  clientId: string
  clientSecret: string
  refreshToken: string
  fetchImpl?: typeof fetch
}) {
  return postToken(
    params.accountsDomain,
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: params.clientId,
      client_secret: params.clientSecret,
      refresh_token: params.refreshToken,
    }),
    params.fetchImpl
  )
}

export async function listZohoBooksOrganizations(params: {
  apiDomain: string
  accessToken: string
  fetchImpl?: typeof fetch
}) {
  const root = params.apiDomain.replace(/\/+$/, '')
  let response: Response
  try {
    response = await (params.fetchImpl ?? fetch)(
      `${root}/books/v4/organizations`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${params.accessToken}`,
          Accept: 'application/json',
        },
      }
    )
  } catch (error) {
    throw new ZohoBooksError({
      code: 'billing/provider-unavailable',
      retryable: true,
      cause: error,
    })
  }
  const raw: unknown = await response.json().catch(() => ({}))
  const parsed = organizationsResponseSchema.safeParse(raw)
  if (!response.ok) {
    const providerCode = parsed.success ? String(parsed.data.code) : ''
    const providerMessage = parsed.success ? parsed.data.message : ''
    throw classifyZohoHttpError(
      response.status,
      providerCode,
      providerMessage
    )
  }
  if (!parsed.success || parsed.data.code !== 0)
    throw new ZohoBooksError({
      code: 'billing/provider-invalid-response',
      httpStatus: response.status,
      retryable: false,
    })
  return parsed.data.organizations
}
