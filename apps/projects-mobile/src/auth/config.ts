import {
  OAUTH_CLIENT_ID,
  NATIVE_REDIRECT_URI,
  OAUTH_SCOPE,
  nativeAuthorizeBaseUrl,
} from '../constants'

export interface AuthorizeRequest {
  codeChallenge: string
  codeChallengeMethod: 'S256'
  state: string
  organizationId?: string
}

export function buildNativeAuthorizeUrl(request: AuthorizeRequest): string {
  if (!OAUTH_CLIENT_ID)
    throw new Error(
      '[projects-mobile] Missing EXPO_PUBLIC_OAUTH_CLIENT_ID. Declare it in .env (see .env.example).'
    )
  const url = new URL(`${nativeAuthorizeBaseUrl()}/`)
  url.searchParams.set('client_id', OAUTH_CLIENT_ID)
  url.searchParams.set('redirect_uri', NATIVE_REDIRECT_URI)
  url.searchParams.set('scope', OAUTH_SCOPE)
  url.searchParams.set('code_challenge', request.codeChallenge)
  url.searchParams.set('code_challenge_method', request.codeChallengeMethod)
  url.searchParams.set('state', request.state)
  if (request.organizationId)
    url.searchParams.set('org_id', request.organizationId)
  return url.toString()
}

export interface NativeCallbackParams {
  code: string | null
  state: string | null
  error: string | null
}

export function parseNativeCallback(url: string): NativeCallbackParams {
  const parsed = new URL(url)
  const params = parsed.searchParams
  return {
    code: params.get('code'),
    state: params.get('state'),
    error: params.get('error'),
  }
}

export function randomState(length = 32): string {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  for (const byte of bytes) out += alphabet[byte % alphabet.length]
  return out
}
