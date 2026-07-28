import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type MockPrismaClient = {
  organizationModule: {
    upsert: ReturnType<typeof vi.fn>
  }
}

const { mockPrismaRef } = vi.hoisted(() => ({
  mockPrismaRef: { current: null as MockPrismaClient | null },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

import { toggle } from './toggle'

const NOW = 1_785_240_000

describe('modules.toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW * 1000))
    mockPrismaRef.current = {
      organizationModule: {
        upsert: vi.fn().mockResolvedValue({ module: 'items', isEnabled: true }),
      },
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('enables a module by creating its missing state row', async () => {
    const upsert = mockPrismaRef.current!.organizationModule.upsert

    const result = await toggle({
      tenantId: 'ten_rocketship',
      module: 'items',
      isEnabled: true,
    })

    expect(result).toEqual({
      data: { module: 'items', isEnabled: true },
      error: null,
    })
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(upsert).toHaveBeenCalledWith({
      where: {
        organization_modules_tenant_id_module_key: {
          tenantId: 'ten_rocketship',
          module: 'items',
        },
      },
      create: {
        tenantId: 'ten_rocketship',
        module: 'items',
        isEnabled: true,
        createdAt: NOW,
        updatedAt: NOW,
      },
      update: { isEnabled: true, updatedAt: NOW },
      select: { module: true, isEnabled: true },
    })
  })

  it('rejects disabling a structural module without writing', async () => {
    const upsert = mockPrismaRef.current!.organizationModule.upsert

    const result = await toggle({
      tenantId: 'ten_rocketship',
      module: 'packages',
      isEnabled: false,
    })

    expect(result).toEqual({
      data: null,
      error: 'That module cannot be turned off.',
      status: 409,
    })
    expect(upsert).not.toHaveBeenCalled()
  })

  it('rejects an unknown module without writing', async () => {
    const upsert = mockPrismaRef.current!.organizationModule.upsert

    const result = await toggle({
      tenantId: 'ten_rocketship',
      module: 'teleportation',
      isEnabled: true,
    })

    expect(result).toEqual({
      data: null,
      error: 'Unknown module.',
      status: 404,
    })
    expect(upsert).not.toHaveBeenCalled()
  })
})
