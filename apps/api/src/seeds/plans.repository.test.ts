import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaRef } = vi.hoisted(() => ({
  prismaRef: {
    current: { applicationModule: { create: vi.fn(), update: vi.fn() } },
  },
}))
vi.mock('@/db/client', () => ({
  get prisma() {
    return prismaRef.current
  },
}))

import {
  createApplicationModule,
  renameApplicationModuleKey,
} from './plans.repository'

describe('createApplicationModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaRef.current = {
      applicationModule: { create: vi.fn(), update: vi.fn() },
    }
  })

  it('creates the module and its initial plan grants in one nested write', async () => {
    const input = {
      id: 'mod_invoices',
      appId: 'app_invoice',
      key: 'invoices',
      name: 'Invoices',
      description: 'Customer invoices',
      featureId: null,
      status: 'active',
      position: 10,
      createdAt: BigInt(1_700_000_000),
      updatedAt: BigInt(1_700_000_000),
      initialGrants: [
        { id: 'pm_invoice_free', productId: 'product_invoice_free' },
      ],
    }
    prismaRef.current.applicationModule.create.mockResolvedValue({
      id: input.id,
    })
    await createApplicationModule(input)
    const { initialGrants, ...fields } = input
    expect(prismaRef.current.applicationModule.create.mock.calls).toEqual([
      [
        {
          data: {
            ...fields,
            planModules: {
              create: initialGrants.map((grant) => ({
                ...grant,
                createdAt: input.createdAt,
                updatedAt: input.updatedAt,
              })),
            },
          },
          select: {
            id: true,
            appId: true,
            key: true,
            name: true,
            description: true,
            featureId: true,
          },
        },
      ],
    ])
  })

  it('propagates a failed nested write so the seed cannot report success', async () => {
    const failure = new Error('Write failed')
    prismaRef.current.applicationModule.create.mockRejectedValue(failure)
    await expect(
      createApplicationModule({
        id: 'mod_invoices',
        appId: 'app_invoice',
        key: 'invoices',
        name: 'Invoices',
        description: 'Customer invoices',
        featureId: null,
        status: 'active',
        position: 10,
        createdAt: BigInt(1_700_000_000),
        updatedAt: BigInt(1_700_000_000),
        initialGrants: [
          { id: 'pm_invoice_free', productId: 'product_invoice_free' },
        ],
      })
    ).rejects.toBe(failure)
    expect(prismaRef.current.applicationModule.create).toHaveBeenCalledTimes(1)
  })
})

describe('renameApplicationModuleKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaRef.current = {
      applicationModule: { create: vi.fn(), update: vi.fn() },
    }
  })

  it('updates only the durable key and timestamp, preserving the module and plan links', async () => {
    await renameApplicationModuleKey('mod_delivery', {
      key: 'deliveries',
      updatedAt: BigInt(1_700_000_000),
    })

    expect(prismaRef.current.applicationModule.update.mock.calls).toEqual([
      [
        {
          where: { id: 'mod_delivery' },
          data: {
            key: 'deliveries',
            updatedAt: BigInt(1_700_000_000),
          },
        },
      ],
    ])
  })
})
