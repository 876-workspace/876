import { beforeEach, describe, expect, it, vi } from 'vitest'

import { serializePaymentMethod } from '../payment-methods.serializers'
import type {
  PaymentMethodCreateParams,
  PaymentMethodListQuery,
  PaymentMethodUpdateParams,
} from '../schemas'

const { mockPrismaRef } = vi.hoisted(() => ({
  mockPrismaRef: { current: null as MockPrisma | null },
}))

vi.mock('@/db/client', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

vi.mock('@/providers/workos/vault', () => ({
  getVaultClient: () => null,
}))

type Row = Record<string, unknown>

type MockPrisma = {
  paymentMethod: {
    create: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
  }
  paymentCredential: {
    create: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
  }
  $transaction: ReturnType<typeof vi.fn>
}

const TENANT = 'ten_1'
const PAN = '4111111111111111'
const KEY = Buffer.alloc(32, 3).toString('base64')

function methodRow(overrides: Row = {}): Row {
  return {
    id: 'pm_1',
    tenantId: TENANT,
    customerId: 'cus_1',
    type: 'CARD',
    status: 'ACTIVE',
    isDefault: false,
    card: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030 },
    displayLabel: 'visa •••• 4242',
    createdAt: 1,
    updatedAt: 1,
    billingDetails: null,
    ...overrides,
  }
}

function cardBody(
  credential: PaymentMethodCreateParams['credential']
): PaymentMethodCreateParams {
  return {
    customerId: 'cus_1',
    type: 'CARD',
    card: {
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2030,
    },
    credential,
  }
}

function buildPrisma(): MockPrisma {
  const prisma: MockPrisma = {
    paymentMethod: {
      create: vi.fn().mockResolvedValue(methodRow()),
      findFirst: vi.fn().mockResolvedValue(methodRow()),
      findMany: vi.fn().mockResolvedValue([methodRow()]),
      update: vi.fn().mockResolvedValue(methodRow({ isDefault: true })),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    paymentCredential: {
      create: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((fn: (tx: MockPrisma) => unknown) =>
    fn(prisma)
  )

  return prisma
}

async function service() {
  const mod = await import('../payment-methods.service')
  return mod.paymentMethodsService
}

beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  const { resetSettingsForTest: reset } = await import('@/config')
  reset({
    BILLING_DATABASE_URL: 'postgres://localhost/billing',
    SECURE_FIELD_KEY: KEY,
  } as NodeJS.ProcessEnv)
  mockPrismaRef.current = buildPrisma()
})

describe('paymentMethodsService.create', () => {
  it('seals a vaulted card number and returns nothing derived from it', async () => {
    const result = await (
      await service()
    ).create(TENANT, cardBody({ storage: 'vault', value: PAN }))

    const credential = mockPrismaRef.current!.paymentCredential.create.mock
      .calls[0]?.[0].data as Row
    const sealed = credential.sealedValue as string

    expect(
      mockPrismaRef.current!.paymentCredential.create
    ).toHaveBeenCalledTimes(1)
    expect(sealed.startsWith('la1:')).toBe(true)
    expect(sealed).not.toContain(PAN)
    expect(JSON.stringify(result)).not.toContain(PAN)
    expect(JSON.stringify(result)).not.toContain(sealed)
  })

  it('records the secret that is stored, not the instrument it belongs to', async () => {
    await (
      await service()
    ).create(TENANT, cardBody({ storage: 'vault', value: PAN }))

    const credential = mockPrismaRef.current!.paymentCredential.create.mock
      .calls[0]?.[0].data as Row

    expect(credential.type).toBe('CARD_PAN')
    expect(credential.storage).toBe('LOCAL_KEY')
    expect(credential.providerToken).toBeNull()
  })

  it('stores a provider token as a token, with no sealed value', async () => {
    await (
      await service()
    ).create(
      TENANT,
      cardBody({
        storage: 'provider_token',
        provider: 'fygaro',
        providerConnectionId: 'conn_1',
        providerToken: 'tok_123',
      })
    )

    const credential = mockPrismaRef.current!.paymentCredential.create.mock
      .calls[0]?.[0].data as Row

    expect(credential.type).toBe('PROVIDER_TOKEN')
    expect(credential.storage).toBe('PROVIDER_TOKEN')
    expect(credential.sealedValue).toBeNull()
    expect(credential.providerToken).toBe('tok_123')
  })

  it('refuses a manual method that carries a credential', async () => {
    await expect(
      (await service()).create(TENANT, {
        customerId: 'cus_1',
        type: 'MANUAL',
        manual: { method: 'cash', displayName: 'Cash' },
        credential: { storage: 'provider_token' },
      } as unknown as PaymentMethodCreateParams)
    ).rejects.toMatchObject({
      code: 'payment-method/invalid-credential',
      httpStatus: 422,
    })
    expect(mockPrismaRef.current!.paymentMethod.create).not.toHaveBeenCalled()
  })

  it('refuses a card with no credential at all', async () => {
    await expect(
      (await service()).create(TENANT, {
        customerId: 'cus_1',
        type: 'CARD',
        card: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030 },
        credential: { storage: 'none' },
      } as unknown as PaymentMethodCreateParams)
    ).rejects.toMatchObject({
      code: 'payment-method/invalid-credential',
      httpStatus: 422,
    })
    expect(mockPrismaRef.current!.paymentMethod.create).not.toHaveBeenCalled()
  })

  it('refuses to vault a wallet, which has no secret number of its own', async () => {
    await expect(
      (await service()).create(TENANT, {
        customerId: 'cus_1',
        type: 'WALLET',
        wallet: { type: 'apple_pay' },
        credential: { storage: 'vault', value: PAN },
      } as unknown as PaymentMethodCreateParams)
    ).rejects.toMatchObject({
      code: 'payment-method/invalid-credential',
      httpStatus: 422,
    })
    expect(
      mockPrismaRef.current!.paymentCredential.create
    ).not.toHaveBeenCalled()
  })

  it('seals a bank account number as BANK_ACCOUNT_NUMBER', async () => {
    await (
      await service()
    ).create(TENANT, {
      customerId: 'cus_1',
      type: 'BANK_ACCOUNT',
      bankAccount: { last4: '6789', country: 'US' },
      credential: { storage: 'vault', value: '000123456789' },
    } as unknown as PaymentMethodCreateParams)

    const credential = mockPrismaRef.current!.paymentCredential.create.mock
      .calls[0]?.[0].data as Row
    expect(credential.type).toBe('BANK_ACCOUNT_NUMBER')
    expect(credential.storage).toBe('LOCAL_KEY')
    expect((credential.sealedValue as string).startsWith('la1:')).toBe(true)
  })

  it('allows a wallet with a provider token', async () => {
    const result = await (
      await service()
    ).create(TENANT, {
      customerId: 'cus_1',
      type: 'WALLET',
      wallet: { type: 'apple_pay' },
      credential: {
        storage: 'provider_token',
        provider: 'stripe',
        providerConnectionId: 'conn_1',
        providerToken: 'tok_wallet',
      },
    } as unknown as PaymentMethodCreateParams)

    expect(result).toBeDefined()
    const credential = mockPrismaRef.current!.paymentCredential.create.mock
      .calls[0]?.[0].data as Row
    expect(credential.type).toBe('PROVIDER_TOKEN')
    expect(credential.providerToken).toBe('tok_wallet')
  })

  it('allows a wallet with no credential when storage is none via manual-like path is rejected', async () => {
    await expect(
      (await service()).create(TENANT, {
        customerId: 'cus_1',
        type: 'WALLET',
        wallet: { type: 'google_pay' },
        credential: { storage: 'none' },
      } as unknown as PaymentMethodCreateParams)
    ).rejects.toMatchObject({
      code: 'payment-method/invalid-credential',
      httpStatus: 422,
    })
  })

  it('creates a manual method without any credential', async () => {
    const result = await (
      await service()
    ).create(TENANT, {
      customerId: 'cus_1',
      type: 'MANUAL',
      manual: { method: 'bank_transfer', displayName: 'Bank Transfer' },
    } as unknown as PaymentMethodCreateParams)

    expect(result).toBeDefined()
    expect(mockPrismaRef.current!.paymentMethod.create).toHaveBeenCalledTimes(1)
    expect(
      mockPrismaRef.current!.paymentCredential.create
    ).not.toHaveBeenCalled()
  })

  it('refuses vaulting a manual method', async () => {
    await expect(
      (await service()).create(TENANT, {
        customerId: 'cus_1',
        type: 'MANUAL',
        manual: { method: 'cash', displayName: 'Cash' },
        credential: { storage: 'vault', value: 'secret' },
      } as unknown as PaymentMethodCreateParams)
    ).rejects.toMatchObject({
      code: 'payment-method/invalid-credential',
      httpStatus: 422,
    })
  })

  it('stores provider info on the payment method row for provider tokens', async () => {
    await (
      await service()
    ).create(TENANT, {
      customerId: 'cus_1',
      type: 'CARD',
      card: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030 },
      credential: {
        storage: 'provider_token',
        provider: 'fygaro',
        providerConnectionId: 'conn_99',
        providerToken: 'tok_xyz',
      },
    } as unknown as PaymentMethodCreateParams)

    const methodData = mockPrismaRef.current!.paymentMethod.create.mock
      .calls[0]?.[0].data as Row
    expect(methodData.provider).toBe('fygaro')
    expect(methodData.providerConnectionId).toBe('conn_99')
  })

  it('does not store provider info for vaulted credentials', async () => {
    await (
      await service()
    ).create(TENANT, cardBody({ storage: 'vault', value: PAN }))

    const methodData = mockPrismaRef.current!.paymentMethod.create.mock
      .calls[0]?.[0].data as Row
    expect(methodData.provider).toBeNull()
    expect(methodData.providerConnectionId).toBeNull()
  })

  it('generates a display label from card details', async () => {
    await (
      await service()
    ).create(TENANT, {
      customerId: 'cus_1',
      type: 'CARD',
      card: { brand: 'mastercard', last4: '5555', expMonth: 1, expYear: 2029 },
      credential: { storage: 'vault', value: PAN },
    } as unknown as PaymentMethodCreateParams)

    const methodData = mockPrismaRef.current!.paymentMethod.create.mock
      .calls[0]?.[0].data as Row
    expect(methodData.displayLabel).toBe('mastercard •••• 5555')
  })

  it('generates a display label from bank account last4', async () => {
    await (
      await service()
    ).create(TENANT, {
      customerId: 'cus_1',
      type: 'BANK_ACCOUNT',
      bankAccount: { last4: '9876' },
      credential: { storage: 'vault', value: '0009876' },
    } as unknown as PaymentMethodCreateParams)

    const methodData = mockPrismaRef.current!.paymentMethod.create.mock
      .calls[0]?.[0].data as Row
    expect(methodData.displayLabel).toBe('•••• 9876')
  })

  it('propagates metadata and billingDetails to the row', async () => {
    await (
      await service()
    ).create(TENANT, {
      customerId: 'cus_1',
      type: 'CARD',
      card: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030 },
      billingDetails: { name: 'Jane Doe' },
      metadata: { foo: 'bar' },
      credential: { storage: 'vault', value: PAN },
    } as unknown as PaymentMethodCreateParams)

    const methodData = mockPrismaRef.current!.paymentMethod.create.mock
      .calls[0]?.[0].data as Row
    expect(methodData.billingDetails).toEqual({ name: 'Jane Doe' })
    expect(methodData.metadata).toEqual({ foo: 'bar' })
  })
})

describe('paymentMethodsService.list', () => {
  it('passes tenant and filters to repository and returns a list envelope', async () => {
    const rows = [methodRow({ id: 'pm_1' }), methodRow({ id: 'pm_2' })]
    mockPrismaRef.current!.paymentMethod.findMany.mockResolvedValue(rows)

    const result = await (
      await service()
    ).list(
      TENANT,
      {
        customerId: 'cus_1',
        type: 'CARD',
      } as unknown as PaymentMethodListQuery,
      '/api/v1/payment-methods'
    )

    expect(mockPrismaRef.current!.paymentMethod.findMany).toHaveBeenCalled()
    expect(result.object).toBe('list')
    expect(result.data).toHaveLength(2)
    expect(result.url).toBe('/api/v1/payment-methods')
    expect(result.has_more).toBe(false)
  })

  it('sets has_more true when the page is full', async () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      methodRow({ id: `pm_${i}` })
    )
    mockPrismaRef.current!.paymentMethod.findMany.mockResolvedValue(rows)

    const result = await (
      await service()
    ).list(
      TENANT,
      { limit: 25 } as unknown as PaymentMethodListQuery,
      '/api/v1/payment-methods'
    )
    expect(result.has_more).toBe(true)
  })

  it('filters by status when provided', async () => {
    await (
      await service()
    ).list(
      TENANT,
      { status: 'ACTIVE' } as unknown as PaymentMethodListQuery,
      '/api/v1/payment-methods'
    )
    expect(mockPrismaRef.current!.paymentMethod.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ACTIVE' }),
      })
    )
  })
})

describe('paymentMethodsService.get', () => {
  it('returns a serialized payment method', async () => {
    const row = methodRow({ id: 'pm_1' })
    mockPrismaRef.current!.paymentMethod.findFirst.mockResolvedValue(row)

    const result = await (await service()).get(TENANT, 'pm_1')
    expect(result).toEqual(
      expect.objectContaining({ object: 'payment_method', id: 'pm_1' })
    )
  })

  it('throws not-found when missing', async () => {
    mockPrismaRef.current!.paymentMethod.findFirst.mockResolvedValue(null)
    await expect(
      (await service()).get(TENANT, 'pm_gone')
    ).rejects.toMatchObject({
      code: 'payment-method/not-found',
      httpStatus: 404,
    })
  })

  it('never exposes credential in serialized output', async () => {
    const row = { ...methodRow(), credential: { sealedValue: 'la1:secret' } }
    mockPrismaRef.current!.paymentMethod.findFirst.mockResolvedValue(row)
    const result = await (await service()).get(TENANT, 'pm_1')
    expect(JSON.stringify(result)).not.toContain('sealedValue')
    expect(JSON.stringify(result)).not.toContain('la1:')
  })
})

describe('paymentMethodsService.update', () => {
  it('updates allowed fields and returns the method', async () => {
    const updated = methodRow({ id: 'pm_1', allowRedisplay: 'ALWAYS' })
    mockPrismaRef.current!.paymentMethod.findFirst.mockResolvedValue(updated)

    const result = await (
      await service()
    ).update(TENANT, 'pm_1', {
      allowRedisplay: 'ALWAYS',
      billingDetails: { name: 'New' },
    } as unknown as PaymentMethodUpdateParams)

    expect(
      mockPrismaRef.current!.paymentMethod.updateMany
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT, id: 'pm_1', status: { not: 'DETACHED' } },
      })
    )
    expect(result).toBeDefined()
  })

  it('404s when updating a detached or missing method', async () => {
    mockPrismaRef.current!.paymentMethod.updateMany.mockResolvedValue({
      count: 0,
    })
    await expect(
      (await service()).update(TENANT, 'pm_gone', {
        allowRedisplay: 'ALWAYS',
      } as unknown as PaymentMethodUpdateParams)
    ).rejects.toMatchObject({
      code: 'payment-method/not-found',
      httpStatus: 404,
    })
  })
})

describe('paymentMethodsService.setDefault', () => {
  it('clears the customer previous default in the same transaction', async () => {
    await (await service()).setDefault(TENANT, 'pm_1')

    expect(mockPrismaRef.current!.$transaction).toHaveBeenCalledTimes(1)
    expect(
      mockPrismaRef.current!.paymentMethod.updateMany
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT, customerId: 'cus_1', isDefault: true },
        data: expect.objectContaining({ isDefault: false }),
      })
    )
    expect(mockPrismaRef.current!.paymentMethod.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pm_1' },
        data: expect.objectContaining({ isDefault: true }),
      })
    )
  })

  it.each(['EXPIRED', 'FAILED', 'DETACHED', 'REQUIRES_ACTION'])(
    'refuses to make a %s method the default',
    async (status) => {
      mockPrismaRef.current!.paymentMethod.findFirst.mockResolvedValue(
        methodRow({ status }) as unknown as Record<string, unknown>
      )

      await expect(
        (await service()).setDefault(TENANT, 'pm_1')
      ).rejects.toMatchObject({
        code: 'payment-method/not-active',
        httpStatus: 409,
      })
      expect(mockPrismaRef.current!.$transaction).not.toHaveBeenCalled()
    }
  )

  it('404s an unknown method without touching anything', async () => {
    mockPrismaRef.current!.paymentMethod.findFirst.mockResolvedValue(null)

    await expect(
      (await service()).setDefault(TENANT, 'pm_gone')
    ).rejects.toMatchObject({
      code: 'payment-method/not-found',
      httpStatus: 404,
    })
    expect(mockPrismaRef.current!.$transaction).not.toHaveBeenCalled()
  })

  it('allows setting an ACTIVE method as default even when it is already default', async () => {
    mockPrismaRef.current!.paymentMethod.findFirst.mockResolvedValue(
      methodRow({ status: 'ACTIVE', isDefault: true }) as unknown as Record<
        string,
        unknown
      >
    )
    const result = await (await service()).setDefault(TENANT, 'pm_1')
    expect(result).toBeDefined()
    expect(mockPrismaRef.current!.$transaction).toHaveBeenCalledTimes(1)
  })
})

describe('paymentMethodsService.detach', () => {
  it('revokes the credential and clears the sealed value', async () => {
    const result = await (await service()).detach(TENANT, 'pm_1')

    expect(result).toEqual({
      object: 'payment_method',
      id: 'pm_1',
      deleted: true,
    })
    expect(
      mockPrismaRef.current!.paymentCredential.updateMany
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT, paymentMethodId: 'pm_1' },
        data: expect.objectContaining({
          status: 'REVOKED',
          sealedValue: null,
        }),
      })
    )
  })

  it('drops the method as a default when it is detached', async () => {
    await (await service()).detach(TENANT, 'pm_1')

    const data = mockPrismaRef.current!.paymentMethod.updateMany.mock
      .calls[0]?.[0].data as Row

    expect(data.status).toBe('DETACHED')
    expect(data.isDefault).toBe(false)
    expect(data.detachedAt).toEqual(expect.any(Number))
  })

  it('404s a method that is already detached, and revokes nothing twice', async () => {
    mockPrismaRef.current!.paymentMethod.updateMany.mockResolvedValue({
      count: 0,
    })

    await expect(
      (await service()).detach(TENANT, 'pm_1')
    ).rejects.toMatchObject({
      code: 'payment-method/not-found',
      httpStatus: 404,
    })
    expect(
      mockPrismaRef.current!.paymentCredential.updateMany
    ).not.toHaveBeenCalled()
  })

  it('runs detach inside a transaction', async () => {
    await (await service()).detach(TENANT, 'pm_1')
    expect(mockPrismaRef.current!.$transaction).toHaveBeenCalledTimes(1)
  })

  it('returns the correct shape even when called twice after success', async () => {
    const first = await (await service()).detach(TENANT, 'pm_1')
    expect(first.deleted).toBe(true)
    const secondCallMock = mockPrismaRef.current!.paymentMethod.updateMany
    expect(secondCallMock).toHaveBeenCalled()
  })
})

describe('serializePaymentMethod', () => {
  it('strips credential from output and preserves payment method fields', () => {
    const row = {
      ...methodRow(),
      credential: { sealedValue: 'la1:xxx' },
      extra: 'keep',
    }
    const out = serializePaymentMethod(row)
    expect(out.object).toBe('payment_method')
    expect((out as Record<string, unknown>).credential).toBeUndefined()
    expect((out as Record<string, unknown>).id).toBe('pm_1')
  })

  it('converts bigints to strings', () => {
    const row = methodRow({ createdAt: BigInt(123) })
    const out = serializePaymentMethod(row)
    expect((out as Record<string, unknown>).createdAt).toBe('123')
  })
})
