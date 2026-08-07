import { describe, expect, it, vi } from 'vitest'

import {
  LocalAesGcmProvider,
  SecureFieldError,
  WorkOSVaultProvider,
  getSecureFieldProvider,
  providerForCiphertext,
  type SecureFieldContext,
  type VaultClient,
} from '../secure-field'

/**
 * The base64 key and the sealed fixture below were produced by the **Python**
 * implementation (`core/secure_field.py`) this module replaces. They are the
 * proof that the stored format is identical across the cutover: a row sealed by
 * the FastAPI service must unseal in the Express one, or every encrypted
 * identifier in the database becomes unreadable the moment we deploy.
 */
const KEY_B64 = 'c2VjdXJlLWZpZWxkLWtleS0zMi1ieXRlcy1sb25nISE='
const PYTHON_SEALED =
  'la1:2HhNM4m+8g67VU61.EHiDcl2LF8O+UL47p3r5b1WLoYv2WJFRS7uT2s0OCw=='
const PLAINTEXT = 'TRN-123-456-789'
const CONTEXT: SecureFieldContext = { user_id: 'user_2kL9', type: 'trn' }

function provider(): LocalAesGcmProvider {
  return new LocalAesGcmProvider(Buffer.from(KEY_B64, 'base64'))
}

describe('LocalAesGcmProvider', () => {
  it('unseals a value sealed by the Python implementation', async () => {
    const plaintext = await provider().unseal(
      { ciphertext: PYTHON_SEALED, keyId: null, provider: 'local_aesgcm' },
      CONTEXT
    )

    expect(plaintext).toBe(PLAINTEXT)
  })

  it('round-trips a value', async () => {
    const instance = provider()
    const sealed = await instance.seal(PLAINTEXT, CONTEXT)

    expect(await instance.unseal(sealed, CONTEXT)).toBe(PLAINTEXT)
  })

  it('produces the la1: prefixed nonce.ciphertext format', async () => {
    const sealed = await provider().seal(PLAINTEXT, CONTEXT)

    expect(sealed.ciphertext).toMatch(/^la1:[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/)
    expect(sealed.provider).toBe('local_aesgcm')
  })

  it('never reuses a nonce', async () => {
    // GCM catastrophically loses confidentiality if a nonce repeats under one
    // key, so this is not a style preference.
    const instance = provider()
    const seals = await Promise.all(
      Array.from({ length: 25 }, () => instance.seal(PLAINTEXT, CONTEXT))
    )
    const nonces = new Set(
      seals.map((sealed) => sealed.ciphertext.split('.')[0])
    )

    expect(nonces.size).toBe(25)
  })

  it('never emits the same ciphertext twice for the same input', async () => {
    const instance = provider()
    const first = await instance.seal(PLAINTEXT, CONTEXT)
    const second = await instance.seal(PLAINTEXT, CONTEXT)

    expect(first.ciphertext).not.toBe(second.ciphertext)
  })

  it('refuses to decrypt under a different context', async () => {
    // The whole point of the AAD: a value copied onto another user's row must
    // fail rather than disclose under the wrong identity.
    const instance = provider()
    const sealed = await instance.seal(PLAINTEXT, CONTEXT)

    await expect(
      instance.unseal(sealed, { user_id: 'user_someone_else', type: 'trn' })
    ).rejects.toThrow(SecureFieldError)
  })

  it('refuses to decrypt under a different type on the same user', async () => {
    const instance = provider()
    const sealed = await instance.seal(PLAINTEXT, CONTEXT)

    await expect(
      instance.unseal(sealed, { user_id: 'user_2kL9', type: 'passport' })
    ).rejects.toThrow(SecureFieldError)
  })

  it('is insensitive to the order the context keys were written in', async () => {
    // A value sealed today must unseal tomorrow, whatever order the caller
    // happened to build the object in.
    const instance = provider()
    const sealed = await instance.seal(PLAINTEXT, {
      user_id: 'user_2kL9',
      type: 'trn',
    })

    expect(
      await instance.unseal(sealed, { type: 'trn', user_id: 'user_2kL9' })
    ).toBe(PLAINTEXT)
  })

  it('rejects an empty context rather than sealing unbound', async () => {
    await expect(provider().seal(PLAINTEXT, {})).rejects.toThrow(
      'A secure field context is required.'
    )
  })

  it('detects a tampered ciphertext', async () => {
    const instance = provider()
    const sealed = await instance.seal(PLAINTEXT, CONTEXT)
    const [nonce, body] = sealed.ciphertext.slice('la1:'.length).split('.') as [
      string,
      string,
    ]
    const flipped = Buffer.from(body, 'base64')
    flipped[0] = flipped[0]! ^ 0xff

    await expect(
      instance.unseal(
        {
          ciphertext: `la1:${nonce}.${flipped.toString('base64')}`,
          keyId: null,
          provider: 'local_aesgcm',
        },
        CONTEXT
      )
    ).rejects.toThrow('The sealed value could not be decrypted.')
  })

  it('reports a malformed value without leaking why', async () => {
    await expect(
      provider().unseal(
        { ciphertext: 'la1:not-a-sealed-value', keyId: null, provider: 'x' },
        CONTEXT
      )
    ).rejects.toThrow('The sealed value is malformed.')
  })

  it('never puts the plaintext in an error message', async () => {
    const instance = provider()
    const sealed = await instance.seal(PLAINTEXT, CONTEXT)

    await instance.unseal(sealed, { user_id: 'wrong', type: 'trn' }).then(
      () => expect.unreachable('should have thrown'),
      (error: Error) => expect(error.message).not.toContain(PLAINTEXT)
    )
  })

  it('rejects a key that is not 32 bytes', () => {
    expect(() => new LocalAesGcmProvider(Buffer.alloc(16))).toThrow(
      'SECURE_FIELD_KEY must decode to exactly 32 bytes.'
    )
  })
})

describe('WorkOSVaultProvider', () => {
  function vaultClient(): VaultClient {
    return {
      encrypt: vi.fn().mockResolvedValue({
        ciphertext: 'vault-ciphertext',
        key_id: 'key_1',
      }),
      decrypt: vi.fn().mockResolvedValue(PLAINTEXT),
    }
  }

  it('prefixes the stored value so its provider is readable from the row', async () => {
    const sealed = await new WorkOSVaultProvider(vaultClient()).seal(
      PLAINTEXT,
      CONTEXT
    )

    expect(sealed.ciphertext).toBe('wv1:vault-ciphertext')
    expect(sealed.keyId).toBe('key_1')
    expect(sealed.provider).toBe('workos_vault')
  })

  it('binds the namespace and the sorted context into the vault call', async () => {
    const client = vaultClient()
    await new WorkOSVaultProvider(client, '876').seal(PLAINTEXT, CONTEXT)

    expect(client.encrypt).toHaveBeenCalledWith(PLAINTEXT, {
      context: { namespace: '876', type: 'trn', user_id: 'user_2kL9' },
    })
  })

  it('strips the prefix before handing the value back to the vault', async () => {
    const client = vaultClient()
    await new WorkOSVaultProvider(client).unseal(
      { ciphertext: 'wv1:vault-ciphertext', keyId: null, provider: 'x' },
      CONTEXT
    )

    expect(client.decrypt).toHaveBeenCalledWith(
      'vault-ciphertext',
      expect.anything()
    )
  })

  it('requires a context, exactly as the local provider does', async () => {
    await expect(
      new WorkOSVaultProvider(vaultClient()).seal(PLAINTEXT, {})
    ).rejects.toThrow('A secure field context is required.')
  })
})

describe('getSecureFieldProvider', () => {
  it('refuses to seal when nothing is configured', async () => {
    // Storing plaintext because a key is missing looks like success and leaves
    // unencrypted identifiers in the database — it has to be loud.
    const instance = getSecureFieldProvider()
    expect(instance.provider).toBe('unconfigured')

    await expect(instance.seal(PLAINTEXT, CONTEXT)).rejects.toThrow(
      /No secure field provider is configured/
    )
  })
})

describe('providerForCiphertext', () => {
  it.each([
    [PYTHON_SEALED, 'local_aesgcm'],
    ['wv1:anything', 'workos_vault'],
    ['plaintext-from-before-encryption', 'unknown'],
  ])('names the provider behind %s', (ciphertext, expected) => {
    expect(providerForCiphertext(ciphertext)).toBe(expected)
  })
})
