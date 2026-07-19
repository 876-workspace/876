import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TenantCreateParams } from '@/types/tenant'

import { provision } from './provision'

const mocks = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
  existingTenant: vi.fn(),
  generateId: vi.fn(),
  nowUnixSeconds: vi.fn(),
  loadManifest: vi.fn(),
  loadApplicationManifest: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mocks.prismaRef.current
  },
}))
vi.mock('@/lib/id', () => ({ generateId: mocks.generateId }))
vi.mock('@876/core/timestamps', () => ({
  nowUnixSeconds: mocks.nowUnixSeconds,
}))
vi.mock('@/lib/provisioning/manifest', () => ({
  loadBillingProvisioningManifest: mocks.loadManifest,
  loadBillingApplicationProvisioningManifest: mocks.loadApplicationManifest,
}))

const NOW = 1_783_771_200

type MutationMock = ReturnType<typeof vi.fn>

type Tx = {
  $executeRaw: ReturnType<typeof vi.fn>
  tenant: {
    create: MutationMock
    findUnique: ReturnType<typeof vi.fn>
    update: MutationMock
  }
  currency: { findMany: ReturnType<typeof vi.fn> }
  language: { findFirst: ReturnType<typeof vi.fn> }
  tenantCurrency: { createMany: MutationMock }
  role: { createMany: MutationMock; findMany: ReturnType<typeof vi.fn> }
  member: { upsert: MutationMock }
  paymentMode: { createMany: MutationMock }
  paymentTerm: { createMany: MutationMock }
  invoicePreference: { upsert: MutationMock }
  documentPreference: { createMany: MutationMock }
  taxAuthority: {
    createMany: MutationMock
    findMany: ReturnType<typeof vi.fn>
  }
  taxRate: { createMany: MutationMock; findMany: ReturnType<typeof vi.fn> }
}

let tx: Tx

function echoCreate(): MutationMock {
  return vi.fn(
    async ({ data }: { data: Record<string, unknown> }) => data
  ) as unknown as MutationMock
}

function echoUpsert(): MutationMock {
  return vi.fn(
    async ({ create }: { create: Record<string, unknown> }) => create
  ) as unknown as MutationMock
}

function echoCreateMany(): MutationMock {
  return vi.fn(async ({ data }: { data: unknown[] }) => ({
    count: data.length,
  })) as unknown as MutationMock
}

function prismaMock() {
  return mocks.prismaRef.current as unknown as {
    $transaction: ReturnType<typeof vi.fn>
  }
}

function createParams(
  overrides: Partial<TenantCreateParams> = {}
): TenantCreateParams {
  return {
    name: 'Efesto Billing',
    slug: 'efesto-billing',
    defaultCurrency: 'JMD',
    ...overrides,
  } as TenantCreateParams
}

describe('tenant provisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tx = {
      $executeRaw: vi.fn().mockResolvedValue(0),
      tenant: {
        create: echoCreate(),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(
          async ({ where, data }: Record<string, Record<string, unknown>>) => ({
            id: where.id,
            ...data,
          })
        ),
      },
      currency: { findMany: vi.fn().mockResolvedValue([{ code: 'JMD' }]) },
      language: { findFirst: vi.fn().mockResolvedValue({ code: 'en' }) },
      tenantCurrency: { createMany: echoCreateMany() },
      role: {
        createMany: echoCreateMany(),
        findMany: vi.fn().mockResolvedValue([
          { id: 'role_owner', slug: 'owner' },
          { id: 'role_admin', slug: 'admin' },
          { id: 'role_accountant', slug: 'accountant' },
          { id: 'role_viewer', slug: 'viewer' },
        ]),
      },
      member: { upsert: echoUpsert() },
      paymentMode: { createMany: echoCreateMany() },
      paymentTerm: { createMany: echoCreateMany() },
      invoicePreference: { upsert: echoUpsert() },
      documentPreference: { createMany: echoCreateMany() },
      taxAuthority: {
        createMany: echoCreateMany(),
        findMany: vi.fn(async ({ where }) =>
          where.name.in.map((name: string) => ({
            id: `TaxAuthority-${name}`,
            name,
          }))
        ),
      },
      taxRate: {
        createMany: echoCreateMany(),
        findMany: vi.fn().mockResolvedValue([]),
      },
    }

    mocks.prismaRef.current = {
      $transaction: vi.fn(async (fn: (t: Tx) => Promise<unknown>) => fn(tx)),
      tenant: { findUnique: mocks.existingTenant },
    } as unknown as Record<string, unknown>

    // Echo the entity type so ids are deterministic and linkage is testable.
    mocks.generateId.mockImplementation((type: string) => type)
    mocks.nowUnixSeconds.mockReturnValue(NOW)
    mocks.loadManifest.mockResolvedValue({
      manifestVersion: 1,
      revision: 3,
      defaults: {
        countryCode: 'JM',
        baseCurrency: 'JMD',
        defaultCurrency: 'JMD',
        defaultLanguage: 'en',
        currencies: ['JMD'],
        paymentModes: ['Cash', 'Credit Card', 'Bank Transfer'],
        paymentTerms: [
          { name: 'Due on Receipt', rule: 'DUE_ON_RECEIPT', dueDays: 0 },
          { name: 'Net 15', rule: 'NET_DAYS', dueDays: 15 },
          { name: 'Net 30', rule: 'NET_DAYS', dueDays: 30 },
          { name: 'Net 45', rule: 'NET_DAYS', dueDays: 45 },
          { name: 'Net 60', rule: 'NET_DAYS', dueDays: 60 },
        ],
        invoicePreferences: {
          defaultTaxBehavior: 'EXCLUSIVE',
          lateFeesEnabled: false,
          lateFeeCalculationType: 'PERCENTAGE',
          lateFeePercent: 0,
          lateFeeAmount: null,
          lateFeeGraceDays: 0,
          lateFeeGenerateAsDraft: true,
        },
        taxAuthorities: [
          {
            key: 'taj',
            name: 'Tax Administration Jamaica',
            description: "Jamaica's national revenue administration.",
            countryCode: 'JM',
          },
        ],
        taxRates: [
          {
            authorityKey: 'taj',
            name: 'Standard GCT',
            description: "Jamaica's General Consumption Tax standard rate.",
            taxType: 'gct',
            rate: '15',
            inclusive: false,
          },
        ],
      },
    })
    mocks.loadApplicationManifest.mockResolvedValue({
      manifestVersion: 1,
      revision: 1,
      documentPreferences: [],
    })
    mocks.existingTenant.mockResolvedValue(null)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('seeds the Jamaican GCT authority and default rate even for a non-JM org country', async () => {
    const result = await provision(
      'org_1',
      'usr_1',
      'owner',
      'US',
      createParams()
    )

    expect(result).toEqual({
      data: { id: 'Tenant', created: true, provisioningVersion: 3 },
      error: null,
    })

    // The workspace itself is stamped with the org's country...
    expect(tx.tenant.create.mock.calls[0][0].data.countryCode).toBe('US')
    expect(tx.tenant.create.mock.calls[0][0].data).toMatchObject({
      defaultCurrency: 'JMD',
      defaultLanguage: 'en',
      provisioningVersion: 3,
      provisionedAt: NOW,
    })

    // ...but the tax defaults are always Jamaica's GCT.
    expect(tx.taxAuthority.createMany).toHaveBeenCalledTimes(1)
    expect(tx.taxAuthority.createMany).toHaveBeenCalledWith({
      data: [
        {
          id: 'TaxAuthority',
          tenantId: 'Tenant',
          name: 'Tax Administration Jamaica',
          description: "Jamaica's national revenue administration.",
          countryCode: 'JM',
          subdivisionCode: null,
          isDefault: true,
          isActive: true,
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
      skipDuplicates: true,
    })

    expect(tx.taxRate.createMany).toHaveBeenCalledTimes(1)
    expect(tx.taxRate.createMany).toHaveBeenCalledWith({
      data: [
        {
          id: 'TaxRate',
          tenantId: 'Tenant',
          taxAuthorityId: 'TaxAuthority-Tax Administration Jamaica',
          name: 'Standard GCT',
          description: "Jamaica's General Consumption Tax standard rate.",
          taxType: 'gct',
          rate: '15',
          inclusive: false,
          startsAt: null,
          isDefault: true,
          isActive: true,
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
    })
  })

  it('rejects an unsupported currency without writing tenant data', async () => {
    tx.currency.findMany.mockResolvedValue([])

    const result = await provision(
      'org_1',
      'usr_1',
      'owner',
      'JM',
      createParams()
    )

    expect(result).toEqual({
      data: null,
      error: 'This currency is not supported.',
      status: 422,
    })
    expect(tx.tenant.create).not.toHaveBeenCalled()
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1)
    expect(tx.taxAuthority.createMany).not.toHaveBeenCalled()
    expect(tx.taxRate.createMany).not.toHaveBeenCalled()
  })

  it('creates every configured currency, tax authority, and tax rate', async () => {
    const manifest = await mocks.loadManifest()
    mocks.loadManifest.mockResolvedValue({
      ...manifest,
      defaults: {
        ...manifest.defaults,
        currencies: ['JMD', 'USD'],
        taxAuthorities: [
          ...manifest.defaults.taxAuthorities,
          {
            key: 'irs',
            name: 'Internal Revenue Service',
            description: null,
            countryCode: 'US',
          },
        ],
        taxRates: [
          ...manifest.defaults.taxRates,
          {
            authorityKey: 'irs',
            name: 'Example federal rate',
            description: null,
            taxType: 'example',
            rate: '1',
            inclusive: false,
          },
        ],
      },
    })
    tx.currency.findMany.mockResolvedValue([{ code: 'JMD' }, { code: 'USD' }])

    const result = await provision(
      'org_1',
      'usr_1',
      'owner',
      'JM',
      createParams()
    )

    expect(result.error).toBeNull()
    expect(tx.tenantCurrency.createMany.mock.calls[0][0].data).toHaveLength(2)
    expect(tx.taxAuthority.createMany.mock.calls[0][0].data).toHaveLength(2)
    expect(tx.taxRate.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          taxAuthorityId: 'TaxAuthority-Internal Revenue Service',
        }),
      ]),
    })
  })

  it('rejects provisioning when the manifest language is unavailable', async () => {
    tx.language.findFirst.mockResolvedValue(null)

    const result = await provision(
      'org_1',
      'usr_1',
      'owner',
      'JM',
      createParams()
    )

    expect(result).toEqual({
      data: null,
      error: 'English is not supported.',
      status: 422,
    })
    expect(tx.tenant.create).not.toHaveBeenCalled()
  })

  it('activates Billing on an existing embedded workspace without replacing its values', async () => {
    tx.tenant.findUnique.mockResolvedValue({
      id: 'tenant_existing',
      provisioningVersion: 1,
    })

    const result = await provision(
      'org_1',
      'usr_1',
      'owner',
      'JM',
      createParams()
    )

    expect(result).toEqual({
      data: {
        id: 'tenant_existing',
        created: false,
        provisioningVersion: 3,
      },
      error: null,
    })
    expect(tx.currency.findMany).toHaveBeenCalled()
    expect(tx.language.findFirst).toHaveBeenCalled()
    expect(tx.tenant.create).not.toHaveBeenCalled()
    expect(tx.role.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true })
    )
    expect(tx.paymentMode.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true })
    )
    expect(tx.taxAuthority.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true })
    )
    expect(tx.member.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_userId: {
            tenantId: 'tenant_existing',
            userId: 'usr_1',
          },
        },
      })
    )
    expect(tx.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant_existing' },
      data: { provisioningVersion: 3, updatedAt: NOW },
      select: { id: true, provisioningVersion: true },
    })
  })

  it('returns the race winner after a concurrent provisioning request', async () => {
    prismaMock()
      .$transaction.mockRejectedValueOnce({ code: 'P2002' })
      .mockImplementation(async (fn: (t: Tx) => Promise<unknown>) => fn(tx))
    tx.tenant.findUnique.mockResolvedValue({
      id: 'tenant_race_winner',
      provisioningVersion: 1,
    })

    const result = await provision(
      'org_1',
      'usr_1',
      'owner',
      'JM',
      createParams()
    )

    expect(result).toEqual({
      data: {
        id: 'tenant_race_winner',
        created: false,
        provisioningVersion: 3,
      },
      error: null,
    })
  })

  it('maps an organization admin to Billing admin instead of owner', async () => {
    tx.tenant.findUnique.mockResolvedValue({
      id: 'tenant_existing',
      provisioningVersion: 3,
    })

    const result = await provision(
      'org_1',
      'usr_admin',
      'admin',
      'JM',
      createParams()
    )

    expect(result.error).toBeNull()
    expect(tx.member.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ roleId: 'role_admin' }),
        create: expect.objectContaining({ roleId: 'role_admin' }),
      })
    )
  })
})
