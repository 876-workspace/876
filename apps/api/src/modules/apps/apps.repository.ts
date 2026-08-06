import { prisma } from '@/db/client'
import type { ApiKeyRecord } from '@/http/auth'
import { fromDbUnixSeconds } from '@/platform/timestamps'

/**
 * Every query against the tables the `apps` module owns — `apps`, `api_keys`,
 * app assignments, and per-user app enrollment. No other file may reach them.
 */

/**
 * Look up an API key by the hash of its plaintext.
 *
 * Keys are stored hashed and looked up by hash, so a database dump never yields
 * a usable credential and the lookup itself is a single indexed read.
 */
export async function findApiKeyByHash(
  keyHash: string
): Promise<ApiKeyRecord | null> {
  const row = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: { id: true, appId: true, revoked: true, expiresAt: true },
  })
  if (!row) return null

  return {
    id: row.id,
    appId: row.appId,
    revoked: row.revoked,
    expiresAt: row.expiresAt === null ? null : fromDbUnixSeconds(row.expiresAt),
  }
}

/** Record that a key was presented. Telemetry — the caller must not await it. */
export async function markApiKeyUsed(
  apiKeyId: string,
  at: number
): Promise<void> {
  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { lastUsedAt: BigInt(at) },
  })
}
