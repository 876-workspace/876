import { createHash, timingSafeEqual } from 'node:crypto'

import type { Request } from 'express'

export type CredentialKind = 'internal' | 'app_api_key'
export type Credential = { kind: CredentialKind; value: string }

export function readCredentials(req: Request): Credential[] {
  const credentials: Credential[] = []
  const headers: Array<[CredentialKind, string]> = [
    ['internal', 'x-internal-key'],
    ['app_api_key', 'x-876-api-key'],
  ]
  for (const [kind, header] of headers) {
    const value = req.header(header)?.trim()
    if (value) credentials.push({ kind, value })
  }
  return credentials
}

export function readBearerToken(req: Request): string | null {
  const value = req.header('authorization')?.trim()
  if (!value) return null
  const match = /^Bearer\s+(.+)$/i.exec(value)
  return match?.[1]?.trim() || null
}

export function secretsMatch(presented: string, configured: string): boolean {
  if (!presented || !configured) return false
  return timingSafeEqual(
    createHash('sha256').update(presented).digest(),
    createHash('sha256').update(configured).digest()
  )
}
