import { z } from 'zod'

import type { WorkSyncCredential } from '../../providers/sync/index.js'
import { getVaultClient } from '../../providers/workos/vault.js'
import {
  getSyncSecureFieldProvider,
  syncCredentialContext,
} from '../../platform/secure-field.js'
import * as repository from './sync-credentials.repository.js'

const oauthCredentialSchema = z.strictObject({
  version: z.literal(1),
  kind: z.literal('oauth'),
  refreshToken: z.string().min(1),
})

const caldavCredentialSchema = z.strictObject({
  version: z.literal(1),
  kind: z.literal('caldav'),
  username: z.string().min(1),
  password: z.string().min(1),
})

const storedCredentialSchema = z.discriminatedUnion('kind', [
  oauthCredentialSchema,
  caldavCredentialSchema,
])

type ConnectionIdentity = {
  tenantId: string
  id: string
  provider: string
}

function context(connection: ConnectionIdentity) {
  return syncCredentialContext({
    tenantId: connection.tenantId,
    connectionId: connection.id,
    provider: connection.provider,
  })
}

async function seal(
  connection: ConnectionIdentity,
  value: z.infer<typeof storedCredentialSchema>
) {
  const sealed = await getSyncSecureFieldProvider(
    connection.tenantId,
    getVaultClient()
  ).seal(JSON.stringify(value), context(connection))

  return repository.store({
    connectionId: connection.id,
    sealedSecret: sealed.ciphertext,
    keyId: sealed.keyId,
    vaultProvider: sealed.provider,
  })
}

export async function storeOauth(
  connection: ConnectionIdentity,
  refreshToken: string
) {
  return seal(connection, { version: 1, kind: 'oauth', refreshToken })
}

export async function storeCaldav(
  connection: ConnectionIdentity,
  credentials: { username: string; password: string }
) {
  return seal(connection, {
    version: 1,
    kind: 'caldav',
    username: credentials.username,
    password: credentials.password,
  })
}

export async function resolve(
  credentialRef: string
): Promise<WorkSyncCredential | null> {
  const row = await repository.retrieve(credentialRef)
  if (!row) return null

  const plaintext = await getSyncSecureFieldProvider(
    row.connection.tenantId,
    getVaultClient()
  ).unseal(
    {
      ciphertext: row.sealedSecret,
      keyId: row.keyId,
      provider: row.vaultProvider,
    },
    context(row.connection)
  )
  const stored = storedCredentialSchema.parse(JSON.parse(plaintext))

  if (stored.kind === 'oauth') return { refreshToken: stored.refreshToken }
  return { username: stored.username, password: stored.password }
}

export const syncCredentialResolver = { resolve }
