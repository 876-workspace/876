import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCM,
} from 'node:crypto'

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

/**
 * The subset of the WorkOS Vault client this module needs.
 *
 * Matches `@workos-inc/node`'s `vault` surface exactly: `context` selects the
 * key-encryption key, `associatedData` is authenticated but not stored, and
 * decryption takes only the blob plus that same associated data — the key is
 * identified from the blob itself.
 */
export type VaultKeyContext = Readonly<Record<string, string>>

export type VaultClient = {
  encrypt(
    data: string,
    context: VaultKeyContext,
    associatedData?: string
  ): Promise<string>
  decrypt(encryptedData: string, associatedData?: string): Promise<string>
}

/**
 * WorkOS Vault data-key encryption.
 *
 * The key context is deliberately **coarse** — a namespace, and whatever scope
 * the service chooses to isolate keys by. Making it per-row would mint a
 * key-encryption key per card, which buys nothing and multiplies the blast
 * radius of a rotation.
 *
 * The per-row binding is the **associated data** instead: the same sorted,
 * canonical context the local provider authenticates. That is what makes the
 * two providers equivalent in what they guarantee — a ciphertext moved onto
 * another row fails to decrypt under either one.
 *
 * The plaintext never leaves this process except on the disclosure path, and
 * the key material never enters it at all.
 */
export class WorkOSVaultProvider implements SecureFieldProvider {
  readonly provider = 'workos_vault'
  readonly #client: VaultClient
  readonly #keyContext: VaultKeyContext

  constructor(
    client: VaultClient,
    keyContext: string | VaultKeyContext = '876'
  ) {
    this.#client = client
    this.#keyContext =
      typeof keyContext === 'string' ? { namespace: keyContext } : keyContext
  }

  async seal(
    plaintext: string,
    context: SecureFieldContext
  ): Promise<SealedValue> {
    const associatedData = encodeContext(context).toString('utf8')

    const ciphertext = await this.#client.encrypt(
      plaintext,
      this.#keyContext,
      associatedData
    )

    return {
      ciphertext: `${WORKOS_VAULT_PREFIX}${ciphertext}`,
      // WorkOS carries the wrapped data key inside the blob, so there is no
      // separate key id to record. The column stays for the local provider.
      keyId: null,
      provider: this.provider,
    }
  }

  async unseal(
    sealed: SealedValue,
    context: SecureFieldContext
  ): Promise<string> {
    const associatedData = encodeContext(context).toString('utf8')

    const body = sealed.ciphertext.startsWith(WORKOS_VAULT_PREFIX)
      ? sealed.ciphertext.slice(WORKOS_VAULT_PREFIX.length)
      : sealed.ciphertext

    return this.#client.decrypt(body, associatedData)
  }
}

/**
 * The provider used when nothing is configured.
 *
 * It raises on seal. Storing plaintext because a key is missing would be the
 * worst possible failure mode — it looks like success and leaves unencrypted
 * identifiers in the database — so a misconfiguration must be loud.
 */
export class UnconfiguredProvider implements SecureFieldProvider {
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

/** Names the provider that produced a stored value, from its prefix alone. */
export function providerForCiphertext(ciphertext: string): string {
  if (ciphertext.startsWith(WORKOS_VAULT_PREFIX)) return 'workos_vault'
  if (ciphertext.startsWith(LOCAL_AESGCM_PREFIX)) return 'local_aesgcm'

  return 'unknown'
}

/**
 * Settings a service supplies to choose its provider.
 *
 * Deliberately plain data rather than a service's own settings object: this
 * module is shared by every service that seals a field, and it must not know
 * which one is calling it.
 */
export type SecureFieldSettings = {
  /** Use WorkOS Vault when a client is also supplied. */
  vaultEnabled: boolean
  /** Namespace mixed into the Vault key context. */
  vaultKeyContext?: string
  /** Base64 32-byte key for the local AES-256-GCM provider. */
  secureFieldKey?: string
}

/**
 * Choose the provider for a set of settings.
 *
 * Vault wins when it is enabled *and* a client was supplied; the local key is
 * the development path; neither configured yields a provider that raises rather
 * than one that quietly stores plaintext.
 */
export function resolveSecureFieldProvider(
  settings: SecureFieldSettings,
  vaultClient: VaultClient | null = null
): SecureFieldProvider {
  if (settings.vaultEnabled && vaultClient !== null)
    return new WorkOSVaultProvider(
      vaultClient,
      settings.vaultKeyContext ?? '876'
    )

  if (settings.secureFieldKey) {
    const key = Buffer.from(settings.secureFieldKey, 'base64')
    // Node's base64 decoder is lenient and silently drops invalid characters,
    // so a malformed key would otherwise surface as a wrong-length key or, far
    // worse, a valid-length key that is not the configured one.
    if (
      key.toString('base64').replace(/=+$/, '') !==
      settings.secureFieldKey.replace(/=+$/, '')
    )
      throw new SecureFieldError('SECURE_FIELD_KEY must be valid base64.')

    return new LocalAesGcmProvider(key)
  }

  return new UnconfiguredProvider()
}
