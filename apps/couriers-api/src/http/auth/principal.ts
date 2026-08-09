import type { Request } from 'express'

export type Realm = 'consumer' | 'enterprise'

export type Principal = {
  userId: string | null
  appId: string | null
  apiKeyId: string | null
  internal: boolean
  realm: Realm
  orgId: string | null
  crossRealm: boolean
}

export type ApiKeyRecord = {
  id: string
  appId: string
  revoked: boolean
  expiresAt: number | null
}

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

export function getPrincipal(req: Request): Principal {
  return principals.get(req) ?? anonymousPrincipal()
}

export function setPrincipal(req: Request, principal: Principal): void {
  principals.set(req, principal)
}

export function getApiKey(req: Request): ApiKeyRecord | null {
  return apiKeys.get(req) ?? null
}

export function setApiKey(req: Request, record: ApiKeyRecord): void {
  apiKeys.set(req, record)
}
