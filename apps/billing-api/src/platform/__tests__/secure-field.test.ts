import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resetSettingsForTest } from '@/config'
import {
  credentialContext,
  getSecureFieldProvider,
  type SealedCredentialType,
} from '@/platform/secure-field'
import { getVaultClient, resetVaultClientForTest } from '@/providers/workos'

const KEY = Buffer.alloc(32, 7).toString('base64')
const PAN = '4111111111111111'

function settings(overrides: Record<string, string> = {}) {
  return {
    BILLING_DATABASE_URL: 'postgres://localhost/billing',
    ...overrides,
  } as NodeJS.ProcessEnv
}

function context(
  paymentMethodId = 'pm_1',
  tenantId = 'ten_1',
  type: SealedCredentialType = 'card_pan'
) {
  return credentialContext({ tenantId, paymentMethodId, type })
}

describe('credentialContext', () => {
  it('names the tenant, the payment method, and the credential kind', () => {
    expect(context()).toEqual({
      tenant_id: 'ten_1',
      payment_method_id: 'pm_1',
      type: 'card_pan',
    })
  })
})

describe('getSecureFieldProvider', () => {
  beforeEach(() => {
    resetVaultClientForTest()
    vi.clearAllMocks()
  })

  it('refuses to seal when neither a vault nor a local key is configured', async () => {
    resetSettingsForTest(settings())
    const provider = getSecureFieldProvider('ten_1')

    expect(provider.provider).toBe('unconfigured')
    await expect(provider.seal(PAN, context())).rejects.toThrow(
      /No secure field provider is configured/
    )
  })

  it('seals and unseals a credential under the local key', async () => {
    resetSettingsForTest(settings({ SECURE_FIELD_KEY: KEY }))
    const provider = getSecureFieldProvider('ten_1')

    const sealed = await provider.seal(PAN, context())

    expect(provider.provider).toBe('local_aesgcm')
    expect(sealed.ciphertext.startsWith('la1:')).toBe(true)
    expect(sealed.ciphertext).not.toContain(PAN)
    await expect(provider.unseal(sealed, context())).resolves.toBe(PAN)
  })

  it('refuses a credential replayed onto another payment method', async () => {
    resetSettingsForTest(settings({ SECURE_FIELD_KEY: KEY }))
    const provider = getSecureFieldProvider('ten_1')

    const sealed = await provider.seal(PAN, context('pm_1'))

    await expect(provider.unseal(sealed, context('pm_2'))).rejects.toThrow(
      'The sealed value could not be decrypted.'
    )
  })

  it('refuses a credential replayed under another tenant', async () => {
    resetSettingsForTest(settings({ SECURE_FIELD_KEY: KEY }))

    const sealed = await getSecureFieldProvider('ten_1').seal(
      PAN,
      context('pm_1', 'ten_1')
    )

    await expect(
      getSecureFieldProvider('ten_2').unseal(sealed, context('pm_1', 'ten_2'))
    ).rejects.toThrow('The sealed value could not be decrypted.')
  })

  it('never puts the credential in an error message', async () => {
    resetSettingsForTest(settings({ SECURE_FIELD_KEY: KEY }))
    const provider = getSecureFieldProvider('ten_1')
    const sealed = await provider.seal(PAN, context('pm_1'))

    await provider.unseal(sealed, context('pm_9')).then(
      () => expect.unreachable('should have thrown'),
      (error: Error) => expect(error.message).not.toContain(PAN)
    )
  })

  it('isolates the vault key context per tenant', async () => {
    resetSettingsForTest(
      settings({
        WORKOS_VAULT_ENABLED: 'true',
        WORKOS_API_KEY: 'sk_test',
        WORKOS_VAULT_KEY_CONTEXT: '876-billing',
      })
    )
    const client = {
      encrypt: vi.fn().mockResolvedValue('sealed'),
      decrypt: vi.fn().mockResolvedValue(PAN),
    }

    const sealed = await getSecureFieldProvider('ten_1', client).seal(
      PAN,
      context()
    )

    expect(sealed.ciphertext).toBe('wv1:sealed')
    expect(client.encrypt).toHaveBeenCalledTimes(1)
    expect(client.encrypt).toHaveBeenCalledWith(
      PAN,
      { namespace: '876-billing/ten_1' },
      '{"payment_method_id":"pm_1","tenant_id":"ten_1","type":"card_pan"}'
    )
    expect(client.decrypt).not.toHaveBeenCalled()
  })

  it.each<SealedCredentialType>([
    'card_pan',
    'bank_account_number',
    'provider_token',
  ])('binds the credential kind %s into the associated data', async (type) => {
    resetSettingsForTest(settings({ SECURE_FIELD_KEY: KEY }))
    const provider = getSecureFieldProvider('ten_1')

    const sealed = await provider.seal(PAN, context('pm_1', 'ten_1', type))

    await expect(
      provider.unseal(
        sealed,
        context(
          'pm_1',
          'ten_1',
          type === 'card_pan' ? 'provider_token' : 'card_pan'
        )
      )
    ).rejects.toThrow('The sealed value could not be decrypted.')
  })
})

describe('getVaultClient', () => {
  beforeEach(() => resetVaultClientForTest())

  it('returns null when the vault is not enabled', () => {
    resetSettingsForTest(settings({ WORKOS_API_KEY: 'sk_test' }))
    expect(getVaultClient()).toBeNull()
  })

  it('returns null when the vault is enabled without an api key', () => {
    resetSettingsForTest(settings({ WORKOS_VAULT_ENABLED: 'true' }))
    expect(getVaultClient()).toBeNull()
  })

  it('builds a narrowed client when both are configured', () => {
    resetSettingsForTest(
      settings({ WORKOS_VAULT_ENABLED: 'true', WORKOS_API_KEY: 'sk_test' })
    )
    const client = getVaultClient()

    expect(client).not.toBeNull()
    expect(Object.keys(client!).sort()).toEqual(['decrypt', 'encrypt'])
  })
})
