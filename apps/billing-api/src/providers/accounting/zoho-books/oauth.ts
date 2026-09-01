import { z } from 'zod'

import { ZohoBooksError } from './errors'

export const ZOHO_BOOKS_SCOPES = [
  'ZohoBooks.settings.READ',
  'ZohoBooks.settings.CREATE',
  'ZohoBooks.settings.UPDATE',
  'ZohoBooks.contacts.READ',
  'ZohoBooks.contacts.CREATE',
  'ZohoBooks.contacts.UPDATE',
  'ZohoBooks.estimates.READ',
  'ZohoBooks.estimates.CREATE',
  'ZohoBooks.estimates.UPDATE',
  'ZohoBooks.invoices.READ',
  'ZohoBooks.invoices.CREATE',
  'ZohoBooks.invoices.UPDATE',
  'ZohoBooks.customerpayments.READ',
  'ZohoBooks.customerpayments.CREATE',
  'ZohoBooks.customerpayments.UPDATE',
] as const

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  api_domain: z.string().url().optional(),
  token_type: z.string().optional(),
  expires_in: z.number().int().optional(),
})

const oauthErrorSchema = z.object({
  error: z.string(),
}).passthrough()

function tokenUrl(accountsDomain: string) {
  return `${accountsDomain.replace(/\/+$/, '')}/oauth/v2/token`
}

export function buildZohoBooksAuthorizeUrl(params: {
  accountsDomain: string
  clientId: string
  redirectUri: string
  state: string
  scopes?: readonly string[]
}) {
  const url = new URL(`${params.accountsDomain.replace(/\/+$/, '')}/oauth/v2/auth`)
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('scope', (params.scopes ?? ZOHO_BOOKS_SCOPES).join(','))
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', params.state)
  return url.toString()
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
      message: 'Zoho OAuth could not be reached.',
      retryable: true,
      cause: error,
    })
  }

  const raw: unknown = await response.json().catch(() => ({}))
  const oauthError = oauthErrorSchema.safeParse(raw)
  if (!response.ok || oauthError.success) {
    const providerCode = oauthError.success ? oauthError.data.error : 'oauth-error'
    throw new ZohoBooksError({
      code:
        providerCode === 'invalid_grant'
          ? 'billing/provider-authorization-required'
          : 'billing/provider-authentication-failed',
      message: 'Zoho OAuth rejected the authorization request.',
      httpStatus: response.status,
      retryable: response.status >= 500,
    })
  }

  const parsed = tokenResponseSchema.safeParse(raw)
  if (!parsed.success)
    throw new ZohoBooksError({
      code: 'billing/provider-invalid-response',
      message: 'Zoho OAuth returned an invalid token response.',
      httpStatus: response.status,
      retryable: false,
    })
  return parsed.data
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
