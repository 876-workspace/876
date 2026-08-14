import { createHash, timingSafeEqual } from 'node:crypto'

import type { Request } from 'express'

export type CredentialKind = 'internal' | 'scheduler' | 'app_api_key' | 'oauth'

export type Credential = { kind: CredentialKind; value: string }

export function readCredentials(req: Request): Credential[] {
  const credentials: Credential[] = []
  const headers: Array<[CredentialKind, string]> = [
    ['internal', 'x-internal-key'],
    ['app_api_key', 'x-876-api-key'],
    ['scheduler', 'x-scheduler-key'],
  ]
  for (const [kind, header] of headers) {
    const value = req.header(header)?.trim()
    if (value) credentials.push({ kind, value })
  }
  const authorization = req.header('authorization')
  if (authorization?.startsWith('Bearer ')) {
    const value = authorization.slice('Bearer '.length).trim()
    if (value) credentials.push({ kind: 'oauth', value })
  }
  return credentials
}

export function secretsMatch(presented: string, configured: string): boolean {
  if (!presented || !configured) return false
  return timingSafeEqual(
    createHash('sha256').update(presented).digest(),
    createHash('sha256').update(configured).digest()
  )
}

export function credentialFingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12)
}
