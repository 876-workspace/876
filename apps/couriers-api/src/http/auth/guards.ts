import type { NextFunction, Request, RequestHandler, Response } from 'express'

import { getSettings } from '@/config'
import { errors } from '@/http/errors'
import { bindActor, getLogger } from '@/platform/logger'
import { verifyProviderJwt } from '@/platform/jwt'

import {
  hasApiKeyPrefix,
  hashApiKey,
  keyFingerprint,
  readApiKey,
  readBearerToken,
  readIntegrationKey,
  readInternalKey,
  secretsMatch,
} from './credentials'
import {
  getPrincipal,
  setApiKey,
  setPrincipal,
  type ApiKeyRecord,
  type Principal,
  type Realm,
} from './principal'

const log = getLogger('auth')

export type AuthDependencies = {
  findApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | null>
  markApiKeyUsed(apiKeyId: string, at: number): Promise<void>
}

export type AuthGuards = {
  requireApiKey: RequestHandler
  requireIntegration: RequestHandler
  requireSession: RequestHandler
  requireAdmin: RequestHandler
  // Kiosk device tier (mailbox-number lookup, package collection) will attach
  // here as `requireKioskDevice` — device-bound auth, separate from apiKey/session/admin.
}

function clientIp(req: Request): string | undefined {
  return req.ip
}

function guard(
  handler: (req: Request, res: Response) => Promise<void> | void
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res)).then(() => next(), next)
  }
}

function isRealm(value: unknown): value is Realm {
  return value === 'consumer' || value === 'enterprise'
}

async function resolvePrincipal(req: Request): Promise<Principal> {
  const base = getPrincipal(req)
  const internalKey = readInternalKey(req)
  const configuredKey = getSettings().internalKey
  if (
    internalKey &&
    configuredKey &&
    secretsMatch(internalKey, configuredKey)
  ) {
    bindActor({ internal: true })
    return { ...base, internal: true }
  }

  const token = readBearerToken(req)
  if (!token) return base

  const claims = await verifyProviderJwt(token)
  if (!claims?.sub) {
    log.warn(
      { reason: 'invalid_or_expired', path: req.path },
      'auth.bearer.rejected'
    )
    throw errors.invalidToken()
  }

  if (claims.token_use !== 'access') {
    log.warn(
      { reason: 'wrong_token_use', token_use: claims.token_use },
      'auth.bearer.rejected'
    )
    throw errors.invalidToken()
  }

  const realm = isRealm(claims.realm) ? claims.realm : 'consumer'
  const appId = typeof claims.aud === 'string' ? claims.aud : base.appId

  bindActor({ userId: claims.sub, appId: appId ?? undefined, realm })

  return {
    ...base,
    userId: claims.sub as string,
    appId,
    realm,
    orgId: typeof claims.org_id === 'string' ? claims.org_id : null,
  }
}

export function createAuthGuards(deps: AuthDependencies): AuthGuards {
  const requireApiKey = guard(async (req) => {
    const presented = readApiKey(req)
    if (!presented) {
      log.warn(
        { reason: 'missing', path: req.path, client_ip: clientIp(req) },
        'api_key.rejected'
      )
      throw errors.apiKeyMissing()
    }
    if (!hasApiKeyPrefix(presented)) {
      log.warn(
        { reason: 'bad_prefix', path: req.path, client_ip: clientIp(req) },
        'api_key.rejected'
      )
      throw errors.apiKeyInvalid()
    }
    const record = await deps.findApiKeyByHash(hashApiKey(presented))
    if (!record) {
      log.warn(
        {
          reason: 'unknown',
          key_fp: keyFingerprint(presented),
          path: req.path,
          client_ip: clientIp(req),
        },
        'api_key.rejected'
      )
      throw errors.apiKeyInvalid()
    }
    if (record.revoked) {
      log.warn(
        {
          reason: 'revoked',
          api_key_id: record.id,
          app_id: record.appId,
          client_ip: clientIp(req),
        },
        'api_key.rejected'
      )
      throw errors.apiKeyInvalid()
    }
    const now = Math.floor(Date.now() / 1000)
    if (record.expiresAt !== null && record.expiresAt < now) {
      log.warn(
        {
          reason: 'expired',
          api_key_id: record.id,
          app_id: record.appId,
          expires_at: record.expiresAt,
          client_ip: clientIp(req),
        },
        'api_key.rejected'
      )
      throw errors.apiKeyInvalid()
    }
    void deps.markApiKeyUsed(record.id, now).catch((error: unknown) => {
      log.warn({ err: error, api_key_id: record.id }, 'api_key.touch_failed')
    })
    setApiKey(req, record)
    setPrincipal(req, {
      ...getPrincipal(req),
      appId: record.appId,
      apiKeyId: record.id,
    })
    bindActor({ appId: record.appId, apiKeyId: record.id })
  })

  const requireSession = guard(async (req) => {
    const principal = await resolvePrincipal(req)
    setPrincipal(req, principal)
    if (principal.internal || principal.userId) return
    throw errors.noSession()
  })

  const requireIntegration = guard(async (req) => {
    const presented = readIntegrationKey(req)
    const configured = getSettings().integrationKey
    if (!presented) {
      log.warn(
        { reason: 'missing', path: req.path, client_ip: clientIp(req) },
        'integration_key.rejected'
      )
      throw errors.integrationKeyMissing()
    }
    if (!configured || !secretsMatch(presented, configured)) {
      log.warn(
        { reason: 'invalid', path: req.path, client_ip: clientIp(req) },
        'integration_key.rejected'
      )
      throw errors.integrationKeyInvalid()
    }
  })

  const requireAdmin = guard(async (req) => {
    const principal = await resolvePrincipal(req)
    setPrincipal(req, principal)
    if (principal.internal) return
    if (principal.userId) {
      log.warn(
        {
          reason: 'non_internal_principal',
          user_id: principal.userId,
          realm: principal.realm,
          app_id: principal.appId,
        },
        'admin.denied'
      )
      throw errors.forbidden()
    }
    throw errors.noSession()
  })

  return { requireApiKey, requireIntegration, requireSession, requireAdmin }
}
