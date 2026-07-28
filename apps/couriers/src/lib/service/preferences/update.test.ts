import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ModulePreference } from '@/lib/db'

type MockModulePreference = {
  findMany: ReturnType<typeof vi.fn>
  upsert: ReturnType<typeof vi.fn>
  deleteMany: ReturnType<typeof vi.fn>
}

type MockPrismaClient = {
  modulePreference: MockModulePreference
  $transaction: ReturnType<typeof vi.fn>
}

const { mockPrismaRef } = vi.hoisted(() => ({
  mockPrismaRef: { current: null as MockPrismaClient | null },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

import { update } from './update'

const NOW = 1_785_240_000

function preferenceRow(
  overrides: Partial<ModulePreference> = {}
): ModulePreference {
  return {
    id: 'mpref_volumetric_divisor',
    tenantId: 'ten_rocketship',
    module: 'packages',
    key: 'volumetric_divisor',
    valueType: 'integer',
    stringValue: null,
    integerValue: 6000,
    decimalValue: null,
    booleanValue: null,
    referenceNamespace: null,
    referenceKey: null,
    updatedBy: 'usr_alejandra',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

describe('preferences.update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW * 1000))

    const modulePreference: MockModulePreference = {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    }
    mockPrismaRef.current = {
      modulePreference,
      $transaction: vi.fn(async (callback) => callback({ modulePreference })),
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('rejects an unknown preference key without writing', async () => {
    const prisma = mockPrismaRef.current!

    const result = await update({
      tenantId: 'ten_rocketship',
      module: 'packages',
      values: { warp_speed: true },
      updatedBy: 'usr_alejandra',
    })

    expect(result).toEqual({
      data: null,
      error: 'Unrecognized key: "warp_speed"',
      status: 400,
    })
    expect(prisma.modulePreference.findMany).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.modulePreference.upsert).not.toHaveBeenCalled()
    expect(prisma.modulePreference.deleteMany).not.toHaveBeenCalled()
  })

  it('writes a value that differs from the catalog default', async () => {
    const prisma = mockPrismaRef.current!
    prisma.modulePreference.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([preferenceRow()])

    const result = await update({
      tenantId: 'ten_rocketship',
      module: 'packages',
      values: { volumetric_divisor: 6000 },
      updatedBy: 'usr_alejandra',
    })

    expect(result).toEqual({
      data: {
        volumetric_divisor: 6000,
        chargeable_weight_rule: 'greater_of',
        require_tracking_number: true,
        auto_generate_tracking: false,
      },
      error: null,
    })
    expect(prisma.modulePreference.upsert).toHaveBeenCalledTimes(1)
    expect(prisma.modulePreference.upsert).toHaveBeenCalledWith({
      where: {
        module_preferences_tenant_id_module_key_key: {
          tenantId: 'ten_rocketship',
          module: 'packages',
          key: 'volumetric_divisor',
        },
      },
      create: {
        tenantId: 'ten_rocketship',
        module: 'packages',
        key: 'volumetric_divisor',
        valueType: 'integer',
        stringValue: null,
        integerValue: 6000,
        decimalValue: null,
        booleanValue: null,
        referenceNamespace: null,
        referenceKey: null,
        updatedBy: 'usr_alejandra',
        updatedAt: NOW,
        createdAt: NOW,
      },
      update: {
        valueType: 'integer',
        stringValue: null,
        integerValue: 6000,
        decimalValue: null,
        booleanValue: null,
        referenceNamespace: null,
        referenceKey: null,
        updatedBy: 'usr_alejandra',
        updatedAt: NOW,
      },
    })
    expect(prisma.modulePreference.deleteMany).not.toHaveBeenCalled()
  })

  it('deletes a stored row when the new value equals the default', async () => {
    const prisma = mockPrismaRef.current!
    prisma.modulePreference.findMany
      .mockResolvedValueOnce([preferenceRow()])
      .mockResolvedValueOnce([])

    const result = await update({
      tenantId: 'ten_rocketship',
      module: 'packages',
      values: { volumetric_divisor: 5000 },
      updatedBy: 'usr_alejandra',
    })

    expect(result).toEqual({
      data: {
        volumetric_divisor: 5000,
        chargeable_weight_rule: 'greater_of',
        require_tracking_number: true,
        auto_generate_tracking: false,
      },
      error: null,
    })
    expect(prisma.modulePreference.deleteMany).toHaveBeenCalledTimes(1)
    expect(prisma.modulePreference.deleteMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_rocketship',
        module: 'packages',
        key: 'volumetric_divisor',
      },
    })
    expect(prisma.modulePreference.upsert).not.toHaveBeenCalled()
  })

  it('rejects an out-of-range integer without writing', async () => {
    const prisma = mockPrismaRef.current!

    const result = await update({
      tenantId: 'ten_rocketship',
      module: 'packages',
      values: { volumetric_divisor: 50 },
      updatedBy: 'usr_alejandra',
    })

    expect(result).toEqual({
      data: null,
      error: 'Too small: expected number to be >=1000',
      status: 400,
    })
    expect(prisma.modulePreference.findMany).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.modulePreference.upsert).not.toHaveBeenCalled()
    expect(prisma.modulePreference.deleteMany).not.toHaveBeenCalled()
  })

  it('writes a decimal as a string', async () => {
    const prisma = mockPrismaRef.current!
    prisma.modulePreference.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        preferenceRow({
          id: 'mpref_storage_fee',
          module: 'warehouse',
          key: 'storage_fee_per_day',
          valueType: 'decimal',
          integerValue: null,
          decimalValue: '2.50',
        }),
      ])

    const result = await update({
      tenantId: 'ten_rocketship',
      module: 'warehouse',
      values: { storage_fee_per_day: '2.50' },
      updatedBy: 'usr_alejandra',
    })

    expect(result).toEqual({
      data: {
        auto_notify_on_receipt: true,
        storage_free_days: 30,
        storage_fee_per_day: '2.50',
      },
      error: null,
    })
    expect(prisma.modulePreference.upsert).toHaveBeenCalledTimes(1)
    expect(prisma.modulePreference.upsert).toHaveBeenCalledWith({
      where: {
        module_preferences_tenant_id_module_key_key: {
          tenantId: 'ten_rocketship',
          module: 'warehouse',
          key: 'storage_fee_per_day',
        },
      },
      create: {
        tenantId: 'ten_rocketship',
        module: 'warehouse',
        key: 'storage_fee_per_day',
        valueType: 'decimal',
        stringValue: null,
        integerValue: null,
        decimalValue: '2.50',
        booleanValue: null,
        referenceNamespace: null,
        referenceKey: null,
        updatedBy: 'usr_alejandra',
        updatedAt: NOW,
        createdAt: NOW,
      },
      update: {
        valueType: 'decimal',
        stringValue: null,
        integerValue: null,
        decimalValue: '2.50',
        booleanValue: null,
        referenceNamespace: null,
        referenceKey: null,
        updatedBy: 'usr_alejandra',
        updatedAt: NOW,
      },
    })
    expect(prisma.modulePreference.deleteMany).not.toHaveBeenCalled()
  })
})
