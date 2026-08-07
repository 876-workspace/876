import type { NextFunction, Request, RequestHandler, Response } from 'express'

import { getSettings } from '@/config'
import { errors } from '@/http/errors'
import { bindActor, getLogger } from '@/platform/logger'
import { verifyProviderJwt } from '@/platform/jwt'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  hasApiKeyPrefix,
  hashApiKey,
  keyFingerprint,
  readApiKey,
  readBearerToken,
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

/**
 * The auth tiers, as Express middleware.
 *
 * The rule the whole model rests on: an exposable key never carries privileged
 * scope. An app key reaches self-scoped endpoints; every privileged operation
 * requires the secret internal key, which never reaches a browser
 * (.claude/rules/platform-services.md).
 *
 * The guards are built by a factory rather than exported directly because
 * validating an API key is a database read of a table the `apps` module owns,
 * and `http/` may not import a module. The composition root injects the lookup.
 */

const log = getLogger('auth')

export type AuthDependencies = {
  /** Look up an API key by the SHA-256 hash of its plaintext. */
  findApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | null>
  /** Record that a key was used. Never allowed to fail the request. */
  markApiKeyUsed(apiKeyId: string, at: number): Promise<void>
}

export type AuthGuards = {
  requireApiKey: RequestHandler
  requireSession: RequestHandler
  requireAdmin: RequestHandler
  requireConsumerSession: RequestHandler
  requireEnterpriseSession: RequestHandler
}

function clientIp(req: Request): string | undefined {
  return req.ip
}

/** Wrap an async guard so a rejection reaches the error middleware. */
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

/**
 * Populate the principal without demanding anything of it.
 *
 * The faithful equivalent of a FastAPI route taking
 * `principal: Annotated[Principal, Depends(resolve_principal)]` while its router
 * only carries `require_api_key`. Several read routes do exactly that so they
 * can widen what they return for a platform caller — the directory's
 * `include_deleted` is the first — and without this the `apiKey` tier never
 * resolves the internal key, so `principal.internal` would read `false` for a
 * caller that genuinely holds platform authority.
 *
 * This grants nothing on its own. It is attached as route `middleware`, after
 * the tier's guard, so the tier still decides who may call at all.
 */
export const attachPrincipal: RequestHandler = guard(async (req) => {
  setPrincipal(req, await resolvePrincipal(req))
})

/**
 * Resolve the caller from the credentials on the request.
 *
 * Order matters: the internal key wins, because a server-to-server call that
 * also forwards a user's bearer token is still acting with platform authority.
 */
async function resolvePrincipal(req: Request): Promise<Principal> {
  const base = getPrincipal(req)

  const internalKey = readInternalKey(req)
  const configuredKey = getSettings().internalKey
  // An unset internal key must never mean "allow": with no secret configured
  // there is no way to prove platform authority, so nothing gets it.
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

  // Only an access token carries a user session. An id token is for the client
  // to read identity claims, and a client-credentials token has an app — not a
  // user — as its subject. Accepting either would let any token a client holds
  // stand in for the user's first-party session, ignoring the scopes the user
  // actually consented to.
  if (claims.token_use !== 'access') {
    log.warn(
      { reason: 'wrong_token_use', token_use: claims.token_use },
      'auth.bearer.rejected'
    )
    throw errors.invalidToken(
      'The bearer token cannot be used to authorize this request.'
    )
  }

  const realm = isRealm(claims.realm) ? claims.realm : 'consumer'
  // `aud` on an access token is the OAuth client id of the app the token was
  // minted for — not the app row id an API key resolves to. Both answer "which
  // app is acting", from different credentials.
  const appId = typeof claims.aud === 'string' ? claims.aud : base.appId

  bindActor({ userId: claims.sub, appId: appId ?? undefined, realm })

  return {
    ...base,
    userId: claims.sub,
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
      throw errors.apiKeyRevoked()
    }

    const now = nowUnixSeconds()
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
      throw errors.apiKeyExpired()
    }

    // Last-used is telemetry. A write failure here must not turn an authorized
    // request into a 500.
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

  /**
   * Consumer and enterprise are separate identities: a consumer session must
   * not reach enterprise-scoped APIs, or the reverse. The internal key is
   * server-to-server platform authority and is not realm-bound.
   */
  function requireRealm(realm: Realm): RequestHandler {
    return guard(async (req) => {
      const principal = await resolvePrincipal(req)
      setPrincipal(req, principal)

      if (!principal.internal && !principal.userId) throw errors.noSession()
      if (principal.internal || principal.crossRealm) return
      if (principal.realm === realm) return

      log.warn(
        {
          required_realm: realm,
          actual_realm: principal.realm,
          user_id: principal.userId,
        },
        'auth.realm.denied'
      )
      throw errors.wrongRealm()
    })
  }

  return {
    requireApiKey,
    requireSession,
    requireAdmin,
    requireConsumerSession: requireRealm('consumer'),
    requireEnterpriseSession: requireRealm('enterprise'),
  }
}
