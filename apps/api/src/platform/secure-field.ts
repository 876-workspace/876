import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCM,
} from 'node:crypto'

import { getSettings } from '@/config'

/**
 * Envelope encryption for individual sensitive columns.
 *
 * One abstraction, two providers: WorkOS Vault in production, AES-256-GCM under
 * a local key for development and tests. The provider is chosen by settings so a
 * developer never needs Vault credentials to run the app, and the stored
 * ciphertext carries a provider prefix so a future migration can tell the two
 * formats apart without guessing.
 *
 * The `context` map is **authenticated associated data**, not metadata. It is
 * always `{ user_id, type }`, which binds the ciphertext to the row that owns
 * it: a value copied onto another user's record fails to decrypt rather than
 * silently disclosing under the wrong identity. Both providers must
 * authenticate it, and neither may treat it as optional.
 */

export const WORKOS_VAULT_PREFIX = 'wv1:'
export const LOCAL_AESGCM_PREFIX = 'la1:'

const NONCE_BYTES = 12
const KEY_BYTES = 32
const TAG_BYTES = 16

/** Sealing or unsealing failed. Never carries the plaintext. */
export class SecureFieldError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'SecureFieldError'
  }
}

export type SealedValue = {
  ciphertext: string
  keyId: string | null
  provider: string
}

export type SecureFieldContext = Readonly<Record<string, string>>

export type SecureFieldProvider = {
  readonly provider: string
  seal(plaintext: string, context: SecureFieldContext): Promise<SealedValue>
  unseal(sealed: SealedValue, context: SecureFieldContext): Promise<string>
}

/**
 * Serialize the AAD deterministically.
 *
 * Sorted keys and no whitespace mean the same context always produces the same
 * bytes — otherwise a value sealed today would fail to unseal tomorrow purely
 * because an object iterated differently.
 */
function encodeContext(context: SecureFieldContext): Buffer {
  const entries = Object.entries(context)
  if (entries.length === 0)
    throw new SecureFieldError('A secure field context is required.')

  const sorted = entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const json = `{${sorted
    .map(([key, value]) => `${JSON.stringify(key)}:${JSON.stringify(value)}`)
    .join(',')}}`

  return Buffer.from(json, 'utf8')
}

/**
 * AES-256-GCM under a single local key from `SECURE_FIELD_KEY`.
 *
 * Used for development and tests. It is a real cipher, not a stub: the point is
 * that dev and production differ in key custody, not in whether the value is
 * encrypted at all.
 */
export class LocalAesGcmProvider implements SecureFieldProvider {
  readonly provider = 'local_aesgcm'
  readonly #key: Buffer
  readonly #keyId: string | null

  constructor(key: Buffer, keyId: string | null = null) {
    if (key.length !== KEY_BYTES)
      throw new SecureFieldError(
        'SECURE_FIELD_KEY must decode to exactly 32 bytes.'
      )

    this.#key = key
    this.#keyId = keyId
  }

  async seal(
    plaintext: string,
    context: SecureFieldContext
  ): Promise<SealedValue> {
    const aad = encodeContext(context)
    const nonce = randomBytes(NONCE_BYTES)

    const cipher = createCipheriv('aes-256-gcm', this.#key, nonce) as CipherGCM
    cipher.setAAD(aad)
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ])
    // Python's AESGCM appends the tag to the ciphertext; Node returns it
    // separately. Concatenating here keeps the stored format identical, so a
    // value sealed by either service unseals in the other.
    const body = Buffer.concat([encrypted, cipher.getAuthTag()])

    return {
      ciphertext: `${LOCAL_AESGCM_PREFIX}${nonce.toString('base64')}.${body.toString('base64')}`,
      keyId: this.#keyId,
      provider: this.provider,
    }
  }

  async unseal(
    sealed: SealedValue,
    context: SecureFieldContext
  ): Promise<string> {
    const aad = encodeContext(context)
    const body = sealed.ciphertext.startsWith(LOCAL_AESGCM_PREFIX)
      ? sealed.ciphertext.slice(LOCAL_AESGCM_PREFIX.length)
      : sealed.ciphertext

    const separator = body.indexOf('.')
    if (separator === -1)
      throw new SecureFieldError('The sealed value is malformed.')

    const nonce = Buffer.from(body.slice(0, separator), 'base64')
    const payload = Buffer.from(body.slice(separator + 1), 'base64')
    if (nonce.length !== NONCE_BYTES || payload.length <= TAG_BYTES)
      throw new SecureFieldError('The sealed value is malformed.')

    const ciphertext = payload.subarray(0, payload.length - TAG_BYTES)
    const tag = payload.subarray(payload.length - TAG_BYTES)

    try {
      const decipher = createDecipheriv('aes-256-gcm', this.#key, nonce)
      decipher.setAAD(aad)
      decipher.setAuthTag(tag)

      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString('utf8')
    } catch (error) {
      // Wrong context or tampered ciphertext — indistinguishable by design.
      throw new SecureFieldError('The sealed value could not be decrypted.', {
        cause: error,
      })
    }
  }
}

/** The subset of the Vault client this module needs. */
export type VaultClient = {
  encrypt(
    plaintext: string,
    options: { context: Record<string, string> }
  ): Promise<{ ciphertext: string; key_id?: string } | string>
  decrypt(
    ciphertext: string,
    options: { context: Record<string, string> }
  ): Promise<string>
}

/**
 * WorkOS Vault data-key encryption.
 *
 * The plaintext never leaves this process unencrypted except in the disclosure
 * path, and the key material never enters it at all.
 */
export class WorkOSVaultProvider implements SecureFieldProvider {
  readonly provider = 'workos_vault'
  readonly #client: VaultClient
  readonly #keyContext: string

  constructor(client: VaultClient, keyContext = '876') {
    this.#client = client
    this.#keyContext = keyContext
  }

  #context(context: SecureFieldContext): Record<string, string> {
    const sorted = Object.entries(context).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0
    )
    return { namespace: this.#keyContext, ...Object.fromEntries(sorted) }
  }

  async seal(
    plaintext: string,
    context: SecureFieldContext
  ): Promise<SealedValue> {
    // Validates that a context was supplied at all, on the same terms as the
    // local provider — Vault authenticates its own copy separately.
    encodeContext(context)

    const result = await this.#client.encrypt(plaintext, {
      context: this.#context(context),
    })

    return {
      ciphertext: `${WORKOS_VAULT_PREFIX}${typeof result === 'string' ? result : result.ciphertext}`,
      keyId: typeof result === 'string' ? null : (result.key_id ?? null),
      provider: this.provider,
    }
  }

  async unseal(
    sealed: SealedValue,
    context: SecureFieldContext
  ): Promise<string> {
    encodeContext(context)

    const body = sealed.ciphertext.startsWith(WORKOS_VAULT_PREFIX)
      ? sealed.ciphertext.slice(WORKOS_VAULT_PREFIX.length)
      : sealed.ciphertext

    return this.#client.decrypt(body, { context: this.#context(context) })
  }
}

/**
 * The provider used when nothing is configured.
 *
 * It raises on seal. Storing plaintext because a key is missing would be the
 * worst possible failure mode — it looks like success and leaves unencrypted
 * identifiers in the database — so a misconfiguration must be loud.
 */
class UnconfiguredProvider implements SecureFieldProvider {
  readonly provider = 'unconfigured'

  async seal(): Promise<SealedValue> {
    throw new SecureFieldError(
      'No secure field provider is configured. Set SECURE_FIELD_KEY or enable WORKOS_VAULT_ENABLED.'
    )
  }

  async unseal(): Promise<string> {
    throw new SecureFieldError('No secure field provider is configured.')
  }
}

export function getSecureFieldProvider(
  vaultClient: VaultClient | null = null
): SecureFieldProvider {
  const { workos, crypto } = getSettings()

  if (workos.vaultEnabled && vaultClient !== null)
    return new WorkOSVaultProvider(vaultClient, workos.vaultKeyContext)

  if (crypto.secureFieldKey) {
    const key = Buffer.from(crypto.secureFieldKey, 'base64')
    // Node's base64 decoder is lenient and silently drops invalid characters,
    // so a malformed key would otherwise surface as a wrong-length key or, far
    // worse, a valid-length key that is not the configured one.
    if (
      key.toString('base64').replace(/=+$/, '') !==
      crypto.secureFieldKey.replace(/=+$/, '')
    )
      throw new SecureFieldError('SECURE_FIELD_KEY must be valid base64.')

    return new LocalAesGcmProvider(key)
  }

  return new UnconfiguredProvider()
}

/** Names the provider that produced a stored value, from its prefix alone. */
export function providerForCiphertext(ciphertext: string): string {
  if (ciphertext.startsWith(WORKOS_VAULT_PREFIX)) return 'workos_vault'
  if (ciphertext.startsWith(LOCAL_AESGCM_PREFIX)) return 'local_aesgcm'

  return 'unknown'
}
