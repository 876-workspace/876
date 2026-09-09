import { providerJson } from './http.js'
import { WorkSyncProviderError } from './provider.js'

export type WorkOauthProvider = 'GOOGLE' | 'MICROSOFT'

export type WorkOauthExchange = {
  refreshToken: string
  accessToken: string
  expiresAt: number
}

export type WorkRemoteAccount = {
  id: string
  label: string
}

const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar',
] as const
const MICROSOFT_SCOPES = [
  'offline_access',
  'openid',
  'profile',
  'email',
  'Calendars.ReadWrite',
] as const

function googleConfig() {
  const clientId = process.env.WORK_GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.WORK_GOOGLE_CLIENT_SECRET?.trim()
  const redirectUri = process.env.WORK_GOOGLE_REDIRECT_URI?.trim()
  if (!clientId || !clientSecret || !redirectUri)
    throw new WorkSyncProviderError(
      'provider-not-configured',
      'Google Calendar OAuth is not configured.'
    )
  return { clientId, clientSecret, redirectUri }
}

function microsoftConfig() {
  const clientId = process.env.WORK_MICROSOFT_CLIENT_ID?.trim()
  const clientSecret = process.env.WORK_MICROSOFT_CLIENT_SECRET?.trim()
  const redirectUri = process.env.WORK_MICROSOFT_REDIRECT_URI?.trim()
  const tenant = process.env.WORK_MICROSOFT_TENANT?.trim() || 'common'
  if (!clientId || !clientSecret || !redirectUri)
    throw new WorkSyncProviderError(
      'provider-not-configured',
      'Microsoft Calendar OAuth is not configured.'
    )
  return { clientId, clientSecret, redirectUri, tenant }
}

export function buildOauthAuthorizeUrl(provider: WorkOauthProvider, state: string) {
  if (provider === 'GOOGLE') {
    const config = googleConfig()
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      scope: GOOGLE_SCOPES.join(' '),
      state,
    }).toString()
    return url.toString()
  }

  const config = microsoftConfig()
  const url = new URL(
    `https://login.microsoftonline.com/${encodeURIComponent(config.tenant)}/oauth2/v2.0/authorize`
  )
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    response_mode: 'query',
    scope: MICROSOFT_SCOPES.join(' '),
    state,
  }).toString()
  return url.toString()
}

async function tokenRequest(url: string, body: URLSearchParams) {
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    })
  } catch (error) {
    throw new WorkSyncProviderError(
      'provider-unavailable',
      'The calendar provider OAuth service could not be reached.'
    )
  }

  if (!response.ok)
    throw new WorkSyncProviderError(
      response.status === 400 || response.status === 401
        ? 'provider-unauthorized'
        : 'provider-unavailable',
      'The calendar provider rejected the OAuth exchange.'
    )

  try {
    return (await response.json()) as {
      access_token?: string
      refresh_token?: string
      expires_in?: number
    }
  } catch (error) {
    throw new WorkSyncProviderError(
      'provider-invalid-response',
      'The calendar provider OAuth service returned invalid JSON.'
    )
  }
}

export async function exchangeOauthCode(
  provider: WorkOauthProvider,
  code: string
): Promise<WorkOauthExchange> {
  const now = Math.floor(Date.now() / 1000)
  if (provider === 'GOOGLE') {
    const config = googleConfig()
    const token = await tokenRequest(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
        code,
      })
    )
    if (!token.access_token || !token.refresh_token)
      throw new WorkSyncProviderError(
        'provider-invalid-response',
        'Google OAuth did not return offline calendar credentials.'
      )
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: now + Math.max(60, token.expires_in ?? 3600),
    }
  }

  const config = microsoftConfig()
  const token = await tokenRequest(
    `https://login.microsoftonline.com/${encodeURIComponent(config.tenant)}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
      code,
      scope: MICROSOFT_SCOPES.join(' '),
    })
  )
  if (!token.access_token || !token.refresh_token)
    throw new WorkSyncProviderError(
      'provider-invalid-response',
      'Microsoft OAuth did not return offline calendar credentials.'
    )
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: now + Math.max(60, token.expires_in ?? 3600),
  }
}

export async function retrieveRemoteAccount(
  provider: WorkOauthProvider,
  accessToken: string
): Promise<WorkRemoteAccount> {
  if (provider === 'GOOGLE') {
    const account = await providerJson<{
      sub?: string
      email?: string
      name?: string
    }>('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${accessToken}` },
    })
    if (!account.sub)
      throw new WorkSyncProviderError(
        'provider-invalid-response',
        'Google did not return an account id.'
      )
    return {
      id: account.sub,
      label: account.email ?? account.name ?? account.sub,
    }
  }

  const account = await providerJson<{
    id?: string
    displayName?: string
    mail?: string
    userPrincipalName?: string
  }>('https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName', {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  if (!account.id)
    throw new WorkSyncProviderError(
      'provider-invalid-response',
      'Microsoft did not return an account id.'
    )
  return {
    id: account.id,
    label:
      account.mail ??
      account.userPrincipalName ??
      account.displayName ??
      account.id,
  }
}
