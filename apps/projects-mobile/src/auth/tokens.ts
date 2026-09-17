import {
  OAUTH_CLIENT_ID,
  NATIVE_REDIRECT_URI,
  coreEndpoints,
} from '../constants'
import type { SessionTokens } from '../types'

interface TokenResponseBody {
  access_token?: string
  refresh_token?: string | null
  expires_in?: number
}

function requireClientId(): string {
  if (!OAUTH_CLIENT_ID)
    throw new Error(
      '[projects-mobile] Missing EXPO_PUBLIC_OAUTH_CLIENT_ID. Declare it in .env (see .env.example).'
    )
  return OAUTH_CLIENT_ID
}

function toTokens(
  body: TokenResponseBody,
  previous: Pick<SessionTokens, 'refreshToken' | 'userId' | 'organizationId'>
): SessionTokens {
  if (!body.access_token)
    throw new Error('Token endpoint returned no access token.')
  const expiresIn =
    typeof body.expires_in === 'number' && body.expires_in > 0
      ? body.expires_in
      : 3600
  return {
    accessToken: body.access_token,
    refreshToken:
      typeof body.refresh_token === 'string'
        ? body.refresh_token
        : previous.refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    userId: previous.userId,
    organizationId: previous.organizationId,
  }
}

async function postToken(
  body: Record<string, string>,
  fetchImpl: typeof fetch = fetch
): Promise<TokenResponseBody> {
  const response = await fetchImpl(coreEndpoints().token, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  })
  if (!response.ok)
    throw new Error(`Token request failed with status ${response.status}.`)
  return (await response.json()) as TokenResponseBody
}

export async function exchangeCode(
  code: string,
  codeVerifier: string,
  previous: Pick<SessionTokens, 'refreshToken' | 'userId' | 'organizationId'>,
  fetchImpl: typeof fetch = fetch
): Promise<SessionTokens> {
  const body = await postToken(
    {
      grant_type: 'authorization_code',
      client_id: requireClientId(),
      code,
      redirect_uri: NATIVE_REDIRECT_URI,
      code_verifier: codeVerifier,
    },
    fetchImpl
  )
  return toTokens(body, previous)
}

export async function refreshTokens(
  refreshToken: string,
  previous: Pick<SessionTokens, 'userId' | 'organizationId'>,
  fetchImpl: typeof fetch = fetch
): Promise<SessionTokens> {
  const body = await postToken(
    {
      grant_type: 'refresh_token',
      client_id: requireClientId(),
      refresh_token: refreshToken,
    },
    fetchImpl
  )
  return toTokens(body, { ...previous, refreshToken })
}

export async function revokeRefreshToken(
  refreshToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  await fetchImpl(coreEndpoints().revoke, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      token: refreshToken,
      client_id: requireClientId(),
    }).toString(),
  })
}
