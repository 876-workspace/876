import type { Request } from 'express'

/**
 * Who is acting on the current request.
 *
 * One shape for every tier, so a handler reads the caller the same way whether
 * it was reached with an app key, a bearer token, or the internal key.
 */
export type Realm = 'consumer' | 'enterprise'

export type Principal = {
  /** The acting user, when a session authorized the request. */
  userId: string | null
  /**
   * The acting app. Always taken from the validated credential — never from a
   * client-supplied field, or an app could claim to be another app.
   */
  appId: string | null
  apiKeyId: string | null
  /** True when the secret internal key authorized the request. */
  internal: boolean
  realm: Realm
  orgId: string | null
  /** The per-user realm-gate exception: an owner may enter either realm. */
  crossRealm: boolean
}

/** The API key record the guards need. A repository supplies it. */
export type ApiKeyRecord = {
  id: string
  appId: string
  revoked: boolean
  /** Unix seconds, or null when the key does not expire. */
  expiresAt: number | null
}

/**
 * Per-request state, keyed by the request object itself.
 *
 * A `WeakMap` rather than a property on `req`: a global `declare module`
 * augmentation would make `req.principal` writable from anywhere in the
 * service, which is precisely the field that must only ever be written by a
 * guard. Here the setter is module-scoped, so a handler can read the caller and
 * cannot invent one. Entries are collected with the request.
 */
const principals = new WeakMap<Request, Principal>()
const apiKeys = new WeakMap<Request, ApiKeyRecord>()

export function anonymousPrincipal(): Principal {
  return {
    userId: null,
    appId: null,
    apiKeyId: null,
    internal: false,
    realm: 'consumer',
    orgId: null,
    crossRealm: false,
  }
}

/**
 * The principal a guard resolved, or the anonymous one.
 *
 * A handler on a guarded route can rely on this being populated; the fallback
 * exists so an unguarded handler reads a principal rather than `undefined` and
 * cannot mistake absence for permission.
 */
export function getPrincipal(req: Request): Principal {
  return principals.get(req) ?? anonymousPrincipal()
}

/** Record the resolved caller. Only a guard may call this. */
export function setPrincipal(req: Request, principal: Principal): void {
  principals.set(req, principal)
}

/** The API key record this request authenticated with, if it used one. */
export function getApiKey(req: Request): ApiKeyRecord | null {
  return apiKeys.get(req) ?? null
}

export function setApiKey(req: Request, record: ApiKeyRecord): void {
  apiKeys.set(req, record)
}
