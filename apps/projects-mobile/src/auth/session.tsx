import * as AuthSession from 'expo-auth-session'
import * as SecureStore from 'expo-secure-store'
import * as WebBrowser from 'expo-web-browser'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { OAUTH_CLIENT_ID, NATIVE_REDIRECT_URI } from '../constants'
import type { AuthStatus, OrgMembership, SessionTokens } from '../types'
import {
  buildNativeAuthorizeUrl,
  parseNativeCallback,
  randomState,
} from './config'
import { fetchMemberships, fetchUserId } from './core'
import {
  clearTokens,
  isExpired,
  loadTokens,
  saveTokens,
  type TokenBackend,
} from './storage'
import { exchangeCode, refreshTokens, revokeRefreshToken } from './tokens'

WebBrowser.maybeCompleteAuthSession()

const secureStoreBackend: TokenBackend = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
}

export interface SessionContextValue {
  status: AuthStatus
  accessToken: string | null
  userId: string | null
  organizationId: string | null
  memberships: OrgMembership[]
  signIn: (organizationId?: string) => Promise<void>
  signOut: () => Promise<void>
  switchOrganization: (organizationId: string) => Promise<void>
  getValidToken: () => Promise<string>
}

const SessionContext = createContext<SessionContextValue | null>(null)

function requireClientId(): string {
  if (!OAUTH_CLIENT_ID)
    throw new Error(
      '[projects-mobile] Missing EXPO_PUBLIC_OAUTH_CLIENT_ID. Declare it in .env (see .env.example).'
    )
  return OAUTH_CLIENT_ID
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [tokens, setTokens] = useState<SessionTokens | null>(null)
  const [memberships, setMemberships] = useState<OrgMembership[]>([])
  const refreshPromise = useRef<Promise<SessionTokens> | null>(null)

  useEffect(() => {
    let cancelled = false
    loadTokens(secureStoreBackend)
      .then((stored) => {
        if (cancelled) return
        if (stored && !isExpired(stored, Date.now(), 0)) {
          setTokens(stored)
          setStatus('signed-in')
        } else {
          setStatus('signed-out')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('signed-out')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!tokens?.accessToken || status !== 'signed-in') return
    let cancelled = false
    fetchMemberships(tokens.accessToken)
      .then((rows) => {
        if (!cancelled) setMemberships(rows)
      })
      .catch(() => {
        if (!cancelled) setMemberships([])
      })
    return () => {
      cancelled = true
    }
  }, [tokens?.accessToken, status])

  const persist = useCallback(async (next: SessionTokens) => {
    await saveTokens(secureStoreBackend, next)
    setTokens(next)
    setStatus('signed-in')
  }, [])

  const refresh = useCallback(
    async (current: SessionTokens): Promise<SessionTokens> => {
      if (refreshPromise.current) return refreshPromise.current
      const pending = (async () => {
        try {
          if (!current.refreshToken) throw new Error('no refresh token')
          const next = await refreshTokens(current.refreshToken, {
            userId: current.userId,
            organizationId: current.organizationId,
          })
          const userId = current.userId ?? (await fetchUserId(next.accessToken))
          const completed = { ...next, userId }
          await persist(completed)
          return completed
        } finally {
          refreshPromise.current = null
        }
      })()
      refreshPromise.current = pending
      return pending
    },
    [persist]
  )

  const getValidToken = useCallback(async (): Promise<string> => {
    if (!tokens?.accessToken) throw new Error('Not signed in.')
    if (!isExpired(tokens)) return tokens.accessToken
    const next = await refresh(tokens).catch(() => null)
    if (!next) {
      await clearTokens(secureStoreBackend)
      setTokens(null)
      setMemberships([])
      setStatus('signed-out')
      throw new Error('Session expired. Sign in again.')
    }
    return next.accessToken
  }, [tokens, refresh])

  const signIn = useCallback(
    async (organizationId?: string) => {
      requireClientId()
      const request = new AuthSession.AuthRequest({
        clientId: OAUTH_CLIENT_ID,
        redirectUri: NATIVE_REDIRECT_URI,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
      })
      await request.getAuthRequestConfigAsync()
      const verifier = request.codeVerifier
      const challenge = request.codeChallenge
      if (!verifier || !challenge)
        throw new Error('PKCE is unavailable in this runtime.')
      const state = randomState()
      const authorizeUrl = buildNativeAuthorizeUrl({
        codeChallenge: challenge,
        codeChallengeMethod: 'S256',
        state,
        ...(organizationId ? { organizationId } : {}),
      })
      const result = await WebBrowser.openAuthSessionAsync(
        authorizeUrl,
        NATIVE_REDIRECT_URI
      )
      if (result.type !== 'success' || !result.url)
        throw new Error('Sign-in was cancelled.')
      const params = parseNativeCallback(result.url)
      if (params.error) throw new Error(`Sign-in failed: ${params.error}.`)
      if (!params.code || params.state !== state)
        throw new Error('Sign-in response was invalid.')
      const exchanged = await exchangeCode(params.code, verifier, {
        refreshToken: null,
        userId: null,
        organizationId: organizationId ?? null,
      })
      const userId = await fetchUserId(exchanged.accessToken)
      await persist({ ...exchanged, userId })
    },
    [persist]
  )

  const signOut = useCallback(async () => {
    const current = tokens
    await clearTokens(secureStoreBackend)
    setTokens(null)
    setMemberships([])
    setStatus('signed-out')
    if (current?.refreshToken)
      await revokeRefreshToken(current.refreshToken).catch(() => undefined)
  }, [tokens])

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      await signOut()
      await signIn(organizationId)
    },
    [signIn, signOut]
  )

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      accessToken: tokens?.accessToken ?? null,
      userId: tokens?.userId ?? null,
      organizationId: tokens?.organizationId ?? null,
      memberships,
      signIn,
      signOut,
      switchOrganization,
      getValidToken,
    }),
    [
      status,
      tokens,
      memberships,
      signIn,
      signOut,
      switchOrganization,
      getValidToken,
    ]
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used within SessionProvider.')
  return value
}
