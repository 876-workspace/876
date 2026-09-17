import type { SessionTokens } from '../types'

export interface TokenBackend {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

const SESSION_KEY = '876.projects-mobile.session.v1'

function emptyTokens(): SessionTokens {
  return {
    accessToken: '',
    refreshToken: null,
    expiresAt: 0,
    userId: null,
    organizationId: null,
  }
}

export function isExpired(
  tokens: SessionTokens,
  now: number = Date.now(),
  skewMs = 5 * 60 * 1000
): boolean {
  if (!tokens.accessToken) return true
  return tokens.expiresAt - skewMs <= now
}

export async function loadTokens(
  backend: TokenBackend
): Promise<SessionTokens | null> {
  const raw = await backend.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<SessionTokens>
    if (typeof parsed.accessToken !== 'string' || !parsed.accessToken)
      return null
    return {
      accessToken: parsed.accessToken,
      refreshToken:
        typeof parsed.refreshToken === 'string' ? parsed.refreshToken : null,
      expiresAt: typeof parsed.expiresAt === 'number' ? parsed.expiresAt : 0,
      userId: typeof parsed.userId === 'string' ? parsed.userId : null,
      organizationId:
        typeof parsed.organizationId === 'string'
          ? parsed.organizationId
          : null,
    }
  } catch {
    return null
  }
}

export async function saveTokens(
  backend: TokenBackend,
  tokens: SessionTokens
): Promise<void> {
  await backend.setItem(SESSION_KEY, JSON.stringify(tokens))
}

export async function clearTokens(backend: TokenBackend): Promise<void> {
  await backend.removeItem(SESSION_KEY)
}

export { emptyTokens, SESSION_KEY }
