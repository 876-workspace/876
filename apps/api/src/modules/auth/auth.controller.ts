import type { Request, Response } from 'express'

import { getApiKey, getPrincipal } from '@/http/auth'
import { AppHttpError } from '@/platform/errors'
import { getLogger } from '@/platform/logger'
import { enforceRateLimit } from '@/platform/rate-limit'
import { verifyProviderJwt } from '@/platform/jwt'
import { decodeDeviceSignal } from '@/services/auth-telemetry'
import { validBody, validQuery, validParams } from '@/http/middleware/validate'

import type {
  CallbackBody,
  EmailResolveBody,
  LoginBody,
  MagicOtpSendBody,
  MagicOtpVerifyBody,
  OAuthSessionBody,
  RecoverBody,
  RefreshBody,
  RegisterBody,
  RegisterBusinessBody,
  ResetPasswordBody,
  RoutingMembershipsQuery,
  SocialLoginBody,
  SwitchSessionBody,
  VerifyEmailBody,
} from './auth.schemas'
import * as repository from './auth.repository'
import * as service from './auth.service'
import {
  serializeAuthEvent,
  serializeMyDevice,
  serializeMySession,
  serializeRoutingMemberships,
} from './auth.serializers'

const log = getLogger('auth')

function getAppId(req: Request): string | null {
  const record = getApiKey(req)
  if (record?.appId) return record.appId
  const principal = getPrincipal(req)
  if (principal.appId) return principal.appId
  // Fallback to raw header state used in python tests
  const state = (
    req as unknown as { state?: { app_id?: string; appId?: string } }
  ).state
  if (state?.app_id) return state.app_id
  if (state?.appId) return state.appId
  const anyReq = req as unknown as Record<string, unknown>
  if (typeof anyReq['appId'] === 'string') return anyReq['appId'] as string
  return null
}

function pickFirst<T>(...values: (T | null | undefined)[]): T | undefined {
  for (const v of values)
    if (v !== null && v !== undefined && v !== '') return v as T
  return undefined
}

export async function resolveEmail(req: Request, res: Response): Promise<void> {
  const body = validBody<EmailResolveBody>(req)
  const result = await service.resolveEmail(body.identifier)
  res.status(200).json(result)
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = validBody<LoginBody>(req)
  enforceRateLimit('auth.login', body.identifier.trim().toLowerCase(), {
    maxAttempts: 10,
    windowSeconds: 300,
  })
  const authService = service.getAuthService()
  let result
  try {
    result = await authService.login({
      identifier: body.identifier,
      password: body.password,
    })
  } catch (e) {
    if (e instanceof AppHttpError) {
      await service.recordFailure(req, 'login', body.identifier, e.code)
    }
    throw e
  }
  if (result.status === 'pending') {
    log.info({ reason: result.event.kind }, 'auth.login.pending')
    await service.recordFailure(
      req,
      'login',
      body.identifier,
      result.event.kind
    )
    res.status(200).json(serializeAuthEvent(result.event))
    return
  }
  const session = await service.completeAuth({
    req,
    res: res as never,
    result: result as never,
    event: 'login',
    appId: getAppId(req),
  })
  log.info(
    { user_id: (session as { user: { id: string } }).user.id },
    'auth.login.succeeded'
  )
  res.status(200).json(session)
}

export async function createSessionFromOAuth(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<OAuthSessionBody>(req)
  const idToken = (body.id_token ?? body.idToken ?? '') as string
  const claims = await verifyProviderJwt(idToken)
  if (!claims || claims.token_use !== 'id') {
    await service.recordFailure(req, 'callback', null, 'auth/invalid-token')
    throw new AppHttpError({
      code: 'auth/invalid-token',
      message: 'The id token is invalid.',
      httpStatus: 401,
    })
  }
  const appId = getAppId(req)
  if (appId) {
    const app = await repository.findAppById(appId)
    if (app && claims.aud !== app.clientId) {
      log.warn(
        {
          app_id: appId,
          token_aud: claims.aud,
          client_id: app.clientId,
          user_id: claims.sub,
        },
        'auth.oauth_session.audience_mismatch'
      )
      await service.recordFailure(
        req,
        'callback',
        null,
        'auth/forbidden',
        'failed',
        claims.sub as string | null
      )
      throw new AppHttpError({
        code: 'auth/forbidden',
        message: 'The id token was not issued to this client.',
        httpStatus: 403,
      })
    }
  }
  const user = await repository.findUserById(claims.sub as string)
  if (!user) {
    await service.recordFailure(req, 'callback', null, 'auth/no-session')
    throw new AppHttpError({
      code: 'auth/no-session',
      message: 'The account is no longer available.',
      httpStatus: 401,
    })
  }
  await service.establishSessionForUser({
    req,
    res: res as never,
    user,
    event: 'callback',
    appId,
  })
  const { serializeSession } = await import('./auth.serializers')
  const session = serializeSession(user as never)
  log.info(
    { user_id: user.id, app_id: appId },
    'auth.oauth_session.established'
  )
  res.status(200).json(session)
}

export async function register(req: Request, res: Response): Promise<void> {
  const body = validBody<RegisterBody>(req)
  const firstName = pickFirst(body.firstName, body.first_name) ?? ''
  const lastName = pickFirst(body.lastName, body.last_name) ?? ''
  const authService = service.getAuthService()
  const result = await authService.register({
    email: body.email,
    password: body.password,
    firstName,
    lastName,
  })
  if (result.status === 'pending') {
    await service.recordFailure(req, 'register', body.email, result.event.kind)
    res.status(200).json(serializeAuthEvent(result.event))
    return
  }
  const session = await service.completeAuth({
    req,
    res: res as never,
    result: result as never,
    event: 'register',
    appId: getAppId(req),
  })
  res.status(200).json(session)
}

export async function registerBusiness(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<RegisterBusinessBody>(req)
  const firstName = pickFirst(body.firstName, body.first_name) ?? ''
  const lastName = pickFirst(body.lastName, body.last_name) ?? ''
  const organizationName =
    pickFirst(body.organizationName, body.organization_name) ?? ''
  const organizationSlug =
    pickFirst(body.organizationSlug, body.organization_slug) ?? null
  const authService = service.getAuthService()
  const result = await authService.registerBusiness({
    email: body.email,
    password: body.password,
    firstName,
    lastName,
    organizationName,
    organizationSlug,
    sourceAppId: getAppId(req),
  })
  if (result.status === 'pending') {
    await service.recordFailure(
      req,
      'register_business',
      body.email,
      result.event.kind
    )
    res.status(200).json(serializeAuthEvent(result.event))
    return
  }
  const session = await service.completeAuth({
    req,
    res: res as never,
    result: result as never,
    event: 'register_business',
    appId: getAppId(req),
  })
  res.status(200).json(session)
}

export async function socialLogin(req: Request, res: Response): Promise<void> {
  const body = validBody<SocialLoginBody>(req)
  const providerRaw = pickFirst(body.provider) ?? ''
  if (!providerRaw || !providerRaw.trim()) {
    await service.recordFailure(
      req,
      'social',
      pickFirst(body.loginHint, body.login_hint) ?? null,
      'auth/provider-disabled'
    )
    throw new AppHttpError({
      code: 'auth/provider-disabled',
      message:
        'This sign-in method is currently unavailable. Please try another method.',
      httpStatus: 403,
    })
  }
  const provider = await repository.findAuthProviderById(
    providerRaw.trim().toLowerCase()
  )
  if (!provider || !provider.workosProviderId) {
    await service.recordFailure(
      req,
      'social',
      pickFirst(body.loginHint, body.login_hint) ?? null,
      'auth/provider-disabled'
    )
    throw new AppHttpError({
      code: 'auth/provider-disabled',
      message:
        'This sign-in method is currently unavailable. Please try another method.',
      httpStatus: 403,
    })
  }
  const authService = service.getAuthService()
  const origin = (req.get('x-876-origin') ??
    req.headers['x-876-origin'] ??
    null) as string | null
  const url = authService.getAuthorizationUrl({
    provider: provider.workosProviderId,
    screenHint: pickFirst(body.screenHint, body.screen_hint) ?? null,
    loginHint: pickFirst(body.loginHint, body.login_hint) ?? null,
    redirectOrigin: origin,
  })
  await service.recordFailure(
    req,
    'social',
    pickFirst(body.loginHint, body.login_hint) ?? null,
    null,
    'pending'
  )
  res.status(200).json({ url })
}

export async function listProviders(
  _req: Request,
  res: Response
): Promise<void> {
  const rows = await repository.listAuthProviders()
  const data = rows.map((p) => ({
    object: 'auth_provider' as const,
    id: p.id,
    label: p.label,
    icon_slug: p.iconSlug,
  }))
  res.status(200).json({
    object: 'list',
    data,
    has_more: false,
    url: '/auth/providers',
    total_count: data.length,
  })
}

export async function sendMagicOtp(req: Request, res: Response): Promise<void> {
  const body = validBody<MagicOtpSendBody>(req)
  const authService = service.getAuthService()
  let data: { email: string; canResendAt: number }
  try {
    data = await authService.sendOtp({ email: body.email })
  } catch (e) {
    if (e instanceof AppHttpError)
      await service.recordFailure(req, 'otp_send', body.email, e.code)
    throw e
  }
  await service.recordFailure(req, 'otp_send', body.email, null, 'pending')
  res.status(200).json({ email: data.email, canResendAt: data.canResendAt })
}

export async function verifyMagicOtp(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<MagicOtpVerifyBody>(req)
  enforceRateLimit('auth.magic_otp_verify', body.email.trim().toLowerCase(), {
    maxAttempts: 5,
    windowSeconds: 300,
  })
  const authService = service.getAuthService()
  const result = await authService.verifyOtp({
    code: body.code,
    email: body.email,
  })
  if (result.status === 'pending') {
    await service.recordFailure(
      req,
      'otp_verify',
      body.email,
      result.event.kind
    )
    res.status(200).json(serializeAuthEvent(result.event))
    return
  }
  const session = await service.completeAuth({
    req,
    res: res as never,
    result: result as never,
    event: 'otp_verify',
    appId: getAppId(req),
  })
  res.status(200).json({ user: (session as { user: unknown }).user })
}

export async function recover(req: Request, res: Response): Promise<void> {
  const body = validBody<RecoverBody>(req)
  enforceRateLimit('auth.recover', body.email.trim().toLowerCase(), {
    maxAttempts: 3,
    windowSeconds: 900,
  })
  const authService = service.getAuthService()
  let email: string
  try {
    email = await authService.sendRecovery({ email: body.email })
  } catch (e) {
    if (e instanceof AppHttpError)
      await service.recordFailure(req, 'password_recover', body.email, e.code)
    throw e
  }
  await service.recordFailure(
    req,
    'password_recover',
    body.email,
    null,
    'pending'
  )
  res.status(200).json({ email })
}

export async function resetPassword(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<ResetPasswordBody>(req)
  enforceRateLimit('auth.reset_password', body.token, {
    maxAttempts: 5,
    windowSeconds: 300,
  })
  const authService = service.getAuthService()
  let email: string
  try {
    email = await authService.resetPassword({
      token: body.token,
      newPassword: body.password,
    })
  } catch (e) {
    if (e instanceof AppHttpError)
      await service.recordFailure(
        req,
        'password_reset',
        null,
        (e as AppHttpError).code
      )
    throw e
  }
  log.info({ email }, 'auth.password_reset.completed')
  await service.recordFailure(req, 'password_reset', email, null, 'succeeded')
  res.status(200).json({ email })
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const body = validBody<VerifyEmailBody>(req)
  const pendingToken =
    pickFirst(
      body.pendingAuthenticationToken,
      body.pending_authentication_token,
      (body as Record<string, unknown>)['pendingAuthentication_token'] as
        | string
        | undefined
    ) ?? ''
  enforceRateLimit('auth.verify_email', pendingToken, {
    maxAttempts: 5,
    windowSeconds: 300,
  })
  const authService = service.getAuthService()
  const result = await authService.verifyEmail({
    code: body.code,
    pendingAuthenticationToken: pendingToken,
  })
  if (result.status === 'pending') {
    await service.recordFailure(req, 'verify_email', null, result.event.kind)
    res.status(200).json(serializeAuthEvent(result.event))
    return
  }
  const session = await service.completeAuth({
    req,
    res: res as never,
    result: result as never,
    event: 'verify_email',
    appId: getAppId(req),
  })
  res.status(200).json({ user: (session as { user: unknown }).user })
}

export async function callback(req: Request, res: Response): Promise<void> {
  const body = validBody<CallbackBody>(req)
  const codeVerifier = pickFirst(body.codeVerifier, body.code_verifier) ?? null
  const invitationToken =
    pickFirst(body.invitationToken, body.invitation_token) ?? null
  const ipAddress = pickFirst(body.ipAddress, body.ip_address) ?? null
  const userAgent = pickFirst(body.userAgent, body.user_agent) ?? null
  const authService = service.getAuthService()
  let result
  try {
    result = await authService.authenticateWithCode({
      code: body.code,
      codeVerifier,
      invitationToken,
      ipAddress,
      userAgent,
    })
  } catch {
    log.warn('auth.callback.failed')
    await service.recordFailure(req, 'callback', null, 'auth/oauth-failed')
    throw new AppHttpError({
      code: 'auth/oauth-failed',
      message: 'OAuth authentication failed. Please try again.',
      httpStatus: 401,
    })
  }
  if (result.status === 'pending') {
    await service.recordFailure(req, 'callback', null, result.event.kind)
    throw new AppHttpError({
      code: 'auth/oauth-failed',
      message: 'OAuth authentication failed. Please try again.',
      httpStatus: 401,
    })
  }
  const session = await service.completeAuth({
    req,
    res: res as never,
    result: result as never,
    event: 'callback',
    appId: getAppId(req),
  })
  res.status(200).json(session)
}

export async function getSession(req: Request, res: Response): Promise<void> {
  const secret = getServiceCookieSecretOrThrow()
  const payload = service.readSessionPayload(req as never, secret)
  if (!payload) {
    const hasCookie = Boolean(
      (req.cookies as Record<string, string> | undefined)?.[
        service.getSessionCookieName()
      ] ?? req.headers['cookie']
    )
    if (!hasCookie)
      throw new AppHttpError({
        code: 'auth/not-signed-in',
        message: 'No active session.',
        httpStatus: 401,
      })
    throw new AppHttpError({
      code: 'auth/invalid-session',
      message: 'Session is invalid or expired. Please sign in again.',
      httpStatus: 401,
    })
  }
  const { accessToken: _t, ...rest } = payload as Record<string, unknown>
  void _t
  res.status(200).json({ data: rest, error: null })
}

function getServiceCookieSecretOrThrow(): string {
  const secret = service.requireCookieSecret()
  return secret
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const body = validBody<RefreshBody>(req)
  const refreshToken = pickFirst(body.refreshToken, body.refresh_token) ?? ''
  const organizationId =
    pickFirst(body.organizationId, body.organization_id) ?? null
  if (!refreshToken)
    throw new AppHttpError({
      code: 'auth/invalid-input',
      message: 'Please check your input.',
      httpStatus: 400,
    })
  const authService = service.getAuthService()
  let result
  try {
    result = await authService.refresh({ refreshToken, organizationId })
  } catch {
    log.warn('auth.refresh.failed')
    await service.recordFailure(req, 'refresh', null, 'auth/oauth-failed')
    throw new AppHttpError({
      code: 'auth/oauth-failed',
      message: 'OAuth authentication failed. Please try again.',
      httpStatus: 401,
    })
  }
  if (result.status === 'pending') {
    await service.recordFailure(req, 'refresh', null, result.event.kind)
    throw new AppHttpError({
      code: 'auth/oauth-failed',
      message: 'OAuth authentication failed. Please try again.',
      httpStatus: 401,
    })
  }
  const s = result.session
  await service.recordFailure(
    req,
    'refresh',
    s.user.email,
    null,
    'succeeded',
    s.user.id
  )
  res.status(200).json({
    accessToken: s.accessToken,
    refreshToken: s.refreshToken,
    user: {
      id: s.user.id,
      email: s.user.email,
      firstName: s.user.firstName,
      lastName: s.user.lastName,
      emailVerified: s.user.emailVerified,
      avatar: s.user.avatar,
    },
  })
}

export async function logout(req: Request, res: Response): Promise<void> {
  const secret = (() => {
    try {
      return service.requireCookieSecret()
    } catch {
      return null
    }
  })()
  if (secret) {
    const payload = service.readSessionPayload(req as never, secret)
    if (payload) {
      const sids = new Set<string>()
      const accounts =
        (payload as { accounts?: Array<{ sid?: string }> }).accounts ?? []
      for (const a of accounts) if (a.sid) sids.add(a.sid)
      const activeSid = (payload as { sid?: string }).sid
      if (activeSid) sids.add(activeSid)
      for (const sid of sids) await repository.deleteSession(sid)
      log.info({ sessions_deleted: sids.size }, 'auth.logout')
    }
  }
  service.clearSessionCookie(res as never)
  res.status(200).json({})
}

export async function switchSession(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<SwitchSessionBody>(req)
  const secret = service.requireCookieSecret()
  const payload = service.readSessionPayload(req as never, secret)
  if (!payload)
    throw new AppHttpError({
      code: 'auth/no-session',
      message: 'No active session.',
      httpStatus: 401,
    })
  const accounts = (payload as { accounts?: unknown }).accounts as
    | unknown[]
    | undefined
  const { selectAccount } = await import('@/platform/session')
  const target = selectAccount(accounts as never, body.sid)
  if (!target) {
    await service.recordFailure(
      req,
      'session_switch',
      null,
      'auth/session-not-found'
    )
    throw new AppHttpError({
      code: 'auth/session-not-found',
      message: 'That account is not signed in on this device.',
      httpStatus: 404,
    })
  }
  const row = await repository.findSessionById(body.sid)
  if (!row || Number(row.expiresAt) < Math.floor(Date.now() / 1000)) {
    await service.recordFailure(
      req,
      'session_switch',
      null,
      'auth/session-expired'
    )
    throw new AppHttpError({
      code: 'auth/session-expired',
      message: 'That session has expired. Please sign in again.',
      httpStatus: 401,
    })
  }
  const { sealSession } = await import('@/platform/session')
  const sealed = sealSession({
    userData: target as never,
    accessToken: null,
    secret,
    ttlSeconds: service.SESSION_TTL_SECONDS,
    sessionId: body.sid,
    accounts: accounts as never,
    realm:
      ((target as Record<string, unknown>)['realm'] as string) || 'consumer',
    orgId:
      ((target as Record<string, unknown>)['orgId'] as string | null) ?? null,
    crossRealm: Boolean((target as Record<string, unknown>)['crossRealm']),
  })
  service.setSessionCookie(res as never, sealed)
  await service.recordFailure(
    req,
    'session_switch',
    (target as Record<string, unknown>)['email'] as string | null,
    null,
    'succeeded',
    row.userId
  )
  res
    .status(200)
    .json({ object: 'session', active_sid: body.sid, user: target })
}

export async function signoutSession(
  req: Request,
  res: Response
): Promise<void> {
  const { sid } = validParams<{ sid: string }>(req)
  const secret = service.requireCookieSecret()
  const payload = service.readSessionPayload(req as never, secret)
  if (!payload)
    throw new AppHttpError({
      code: 'auth/no-session',
      message: 'No active session.',
      httpStatus: 401,
    })
  const accounts =
    ((payload as { accounts?: unknown }).accounts as unknown[] | undefined) ??
    []
  const { selectAccount } = await import('@/platform/session')
  const account = selectAccount(accounts as never, sid)
  if (!account) {
    await service.recordFailure(req, 'signout', null, 'auth/session-not-found')
    throw new AppHttpError({
      code: 'auth/session-not-found',
      message: 'That account is not signed in on this device.',
      httpStatus: 404,
    })
  }
  const signedOut = await repository.findSessionById(sid)
  await service.recordFailure(
    req,
    'signout',
    (account as Record<string, unknown>)['email'] as string | null,
    null,
    'succeeded',
    signedOut?.userId ?? null
  )
  await repository.deleteSession(sid)
  const remaining = (accounts as Array<Record<string, unknown>>).filter(
    (a) => a['sid'] !== sid
  )
  if (remaining.length === 0) {
    service.clearSessionCookie(res as never)
    res.status(200).json({ object: 'session', signed_out: sid, remaining: 0 })
    return
  }
  const activeSid = (payload as { sid?: string }).sid
  let sealed: string
  if (activeSid === sid) {
    const newActive = remaining[remaining.length - 1]!
    const { sealSession } = await import('@/platform/session')
    sealed = sealSession({
      userData: newActive as never,
      accessToken: null,
      secret,
      ttlSeconds: service.SESSION_TTL_SECONDS,
      sessionId: newActive['sid'] as string,
      accounts: remaining as never,
      realm: (newActive['realm'] as string) || 'consumer',
      orgId: (newActive['orgId'] as string | null) ?? null,
      crossRealm: Boolean(newActive['crossRealm']),
    })
  } else {
    const { sealSession } = await import('@/platform/session')
    sealed = sealSession({
      userData: payload as never,
      accessToken:
        (payload as { accessToken?: string | null }).accessToken ?? null,
      secret,
      ttlSeconds: service.SESSION_TTL_SECONDS,
      sessionId: (payload as { sid?: string }).sid ?? null,
      accounts: remaining as never,
      realm: (payload as { realm?: string }).realm || 'consumer',
      orgId: (payload as { orgId?: string | null }).orgId ?? null,
      crossRealm: Boolean((payload as { crossRealm?: boolean }).crossRealm),
    })
  }
  service.setSessionCookie(res as never, sealed)
  res
    .status(200)
    .json({ object: 'session', signed_out: sid, remaining: remaining.length })
}

export async function getRoutingMemberships(
  req: Request,
  res: Response
): Promise<void> {
  const query = validQuery<RoutingMembershipsQuery>(req)
  const userId = (query.userId ?? query.user_id ?? '')?.trim()
  if (!userId)
    throw new AppHttpError({
      code: 'auth/invalid-input',
      message: 'userId is required',
      httpStatus: 400,
    })
  const orgSlug =
    (query.orgSlug ?? query.org_slug ?? undefined)?.trim() || undefined
  const status = query.status?.trim() || undefined
  const memberships = await repository.findMembershipForRouting(userId, {
    status,
    orgSlug,
  })
  // Resolve permissions for each membership
  const rows: Array<{
    id: string
    role: string
    status: string
    permissions: string[]
    organization: {
      id: string
      name: string | null
      slug: string
      status: string
      logoUrl: string | null
    }
  }> = []
  for (const m of memberships) {
    let permissions: string[] = []
    try {
      const { resolveMemberPermissions } =
        await import('@/services/provisioning')
      // resolveMemberPermissions expects a membership row with organizationId and roleId etc
      const membershipLike = {
        id: m.id,
        organizationId: m.organizationId,
        role: m.role,
        roleId: m.roleId,
      } as never
      const perms = await resolveMemberPermissions(membershipLike as never)
      permissions = [...perms].sort()
    } catch {
      permissions = []
    }
    rows.push({
      id: m.id,
      role: m.role,
      status: m.status,
      permissions,
      organization: m.organization,
    })
  }
  res.status(200).json(serializeRoutingMemberships(rows))
}

export async function listMyDevices(
  req: Request,
  res: Response
): Promise<void> {
  const principal = getPrincipal(req)
  const userId = principal.userId
  if (!userId)
    throw new AppHttpError({
      code: 'auth/no-session',
      message: 'No active session.',
      httpStatus: 401,
    })
  // Resolve current fingerprint from device signal
  let currentFingerprint: string | null = null
  try {
    const signal = decodeDeviceSignal(req.get('x-876-device') ?? null)
    if (signal) currentFingerprint = signal.visitorId
  } catch {
    // A malformed device header is not a reason to fail the request; the
    // fingerprint is advisory and its absence only weakens risk scoring.
  }
  const rows = await repository.listDevicesForUser(userId, 50)
  const data = rows.map((r) =>
    serializeMyDevice(r as never, currentFingerprint)
  )
  res.status(200).json({
    object: 'list',
    data,
    has_more: false,
    url: '/auth/me/devices',
    total_count: data.length,
  })
}

export async function listMySessions(
  req: Request,
  res: Response
): Promise<void> {
  const principal = getPrincipal(req)
  const userId = principal.userId
  if (!userId)
    throw new AppHttpError({
      code: 'auth/no-session',
      message: 'No active session.',
      httpStatus: 401,
    })
  const rows = await repository.listSessionsForUser(userId, 50)
  let currentSid: string | null = null
  try {
    const secret = service.requireCookieSecret()
    const payload = service.readSessionPayload(req as never, secret)
    if (payload) currentSid = (payload as { sid?: string }).sid ?? null
  } catch {}
  const data = rows.map((r) => serializeMySession(r as never, currentSid))
  res.status(200).json({
    object: 'list',
    data,
    has_more: false,
    url: '/auth/me/sessions',
    total_count: data.length,
  })
}

export async function revokeMySession(
  req: Request,
  res: Response
): Promise<void> {
  const principal = getPrincipal(req)
  const userId = principal.userId
  if (!userId)
    throw new AppHttpError({
      code: 'auth/no-session',
      message: 'No active session.',
      httpStatus: 401,
    })
  const { session_id } = validParams<{ session_id: string }>(req)
  const row = await repository.findSessionFullById(session_id)
  if (!row || row.userId !== userId) {
    throw new AppHttpError({
      code: 'auth/session-not-found',
      message: 'That session does not exist.',
      httpStatus: 404,
    })
  }
  await repository.revokeSession(session_id, userId)
  log.info({ user_id: userId, session_id }, 'auth.me.session_revoked')
  res.status(200).json({ object: 'my_session', id: session_id, deleted: true })
}
