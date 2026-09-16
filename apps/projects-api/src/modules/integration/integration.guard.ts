import { createHash } from 'node:crypto'

import type { NextFunction, Request, Response } from 'express'

import { secretsMatch } from '../../http/internal-auth.js'
import { sendProjectsError } from '../../http/result.js'
import { toDbUnixSeconds, nowUnixSeconds } from '../../platform/timestamps.js'
import * as repository from './integration.repository.js'
import type { IntegrationScope } from './integration.schemas.js'

export const INTEGRATION_RATE_LIMIT_PER_MINUTE = 600
const RATE_LIMIT_WINDOW_MS = 60_000

type RateBucket = { windowStart: number; count: number }

const rateBuckets = new Map<string, RateBucket>()

export function resetIntegrationRateLimits(): void {
  rateBuckets.clear()
}

export function checkIntegrationRateLimit(
  clientId: string,
  nowMs: number = Date.now()
): boolean {
  const bucket = rateBuckets.get(clientId)
  if (!bucket || nowMs - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(clientId, { windowStart: nowMs, count: 1 })
    return true
  }
  bucket.count += 1
  return bucket.count <= INTEGRATION_RATE_LIMIT_PER_MINUTE
}

export type ParsedIntegrationToken = {
  clientId: string
  secret: string
}

export function parseIntegrationAuthorization(
  header: string | undefined
): ParsedIntegrationToken | null {
  if (!header) return null
  const prefix = 'Bearer '
  if (!header.startsWith(prefix)) return null
  const token = header.slice(prefix.length).trim()
  const dot = token.indexOf('.')
  if (dot <= 0 || dot === token.length - 1) return null
  const clientId = token.slice(0, dot).trim()
  const secret = token.slice(dot + 1).trim()
  if (clientId === '' || secret === '') return null
  if (!clientId.startsWith('intc_')) return null
  return { clientId, secret }
}

export function hashIntegrationSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex')
}

export function integrationSecretMatches(
  presentedSecret: string,
  storedHash: string
): boolean {
  if (!presentedSecret || !storedHash) return false
  return secretsMatch(hashIntegrationSecret(presentedSecret), storedHash)
}

export type IntegrationContext = {
  clientId: string
  clientName: string
  tenantId: string
  organizationId: string
  scopes: string[]
}

const contexts = new WeakMap<Request, IntegrationContext>()

export function getIntegrationContext(req: Request): IntegrationContext | null {
  return contexts.get(req) ?? null
}

export async function requireIntegrationClient(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const parsed = parseIntegrationAuthorization(req.header('authorization'))
  if (!parsed) {
    sendProjectsError(res, 'projects/unauthorized')
    return
  }
  const row = await repository.retrieveClient(parsed.clientId)
  if (
    !row ||
    row.revokedAt !== null ||
    !integrationSecretMatches(parsed.secret, row.secretHash)
  ) {
    sendProjectsError(res, 'projects/unauthorized')
    return
  }
  if (!checkIntegrationRateLimit(row.id)) {
    sendProjectsError(res, 'projects/rate-limited')
    return
  }
  contexts.set(req, {
    clientId: row.id,
    clientName: row.name,
    tenantId: row.tenantId,
    organizationId: row.organizationId,
    scopes: row.scopes,
  })
  await repository.markClientUsed(row.id, toDbUnixSeconds(nowUnixSeconds()))
  next()
}

export function requireIntegrationScope(scope: IntegrationScope) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const context = getIntegrationContext(req)
    if (!context) {
      sendProjectsError(res, 'projects/unauthorized')
      return
    }
    if (!context.scopes.includes(scope)) {
      sendProjectsError(res, 'projects/forbidden')
      return
    }
    next()
  }
}
