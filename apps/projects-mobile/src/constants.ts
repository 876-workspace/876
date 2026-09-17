function readPublicEnv(name: string): string {
  return (process.env[name] ?? '').trim()
}

function requiredPublicEnv(name: string): string {
  const value = readPublicEnv(name)
  if (!value)
    throw new Error(
      `[projects-mobile] Missing ${name}. Declare it in .env (see .env.example).`
    )
  return value
}

export const NATIVE_SCHEME = 'com.efesto.projects'
export const NATIVE_CALLBACK_PATH = 'oauth/callback'
export const NATIVE_REDIRECT_URI = `${NATIVE_SCHEME}://${NATIVE_CALLBACK_PATH}`

export const PROJECTS_API_URL = 'https://876-projects-api.vercel.app'

export const OAUTH_ISSUER =
  readPublicEnv('EXPO_PUBLIC_OAUTH_ISSUER') || 'https://api.876.app'

export const OAUTH_CLIENT_ID = readPublicEnv('EXPO_PUBLIC_OAUTH_CLIENT_ID')

export const OAUTH_SCOPE = 'openid profile email offline_access'

export function nativeAuthorizeBaseUrl(): string {
  return requiredPublicEnv('EXPO_PUBLIC_876_AUTHORIZE_URL').replace(/\/+$/, '')
}

export interface CoreEndpoints {
  token: string
  userinfo: string
  revoke: string
  memberships: string
}

export function coreEndpoints(issuer: string = OAUTH_ISSUER): CoreEndpoints {
  const base = issuer.replace(/\/+$/, '')
  return {
    token: `${base}/oauth/token`,
    userinfo: `${base}/oauth/userinfo`,
    revoke: `${base}/oauth/revoke`,
    memberships: `${base}/me/memberships`,
  }
}
