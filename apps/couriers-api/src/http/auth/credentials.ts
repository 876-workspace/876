import { createHash, timingSafeEqual } from 'node:crypto'

import type { Request } from 'express'

const API_KEY_PREFIX = '876_app_secret_'

export function readApiKey(req: Request): string | null {
  const dedicated = req.header('x-876-api-key') ?? req.header('x-api-key')
  if (dedicated?.trim()) return dedicated.trim()
  const authorization = req.header('authorization')
  if (authorization?.startsWith(`Bearer ${API_KEY_PREFIX}`))
    return authorization.slice('Bearer '.length).trim() || null
  return null
}

export function readBearerToken(req: Request): string | null {
  const authorization = req.header('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  const token = authorization.slice('Bearer '.length).trim()
  if (!token || token.startsWith(API_KEY_PREFIX)) return null
  return token
}

export function readInternalKey(req: Request): string | null {
  return req.header('x-internal-key')?.trim() || null
}

export function hasApiKeyPrefix(key: string): boolean {
  return key.startsWith(API_KEY_PREFIX)
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key, 'utf8').digest('hex')
}

export function keyFingerprint(key: string): string {
  return hashApiKey(key).slice(0, 12)
}

export function secretsMatch(presented: string, configured: string): boolean {
  if (!presented || !configured) return false
  return timingSafeEqual(
    createHash('sha256').update(presented, 'utf8').digest(),
    createHash('sha256').update(configured, 'utf8').digest()
  )
}
