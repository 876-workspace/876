import { createHash } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FinanceProvisioningEvent } from '@/types/finance-provisioning'

import { ensure } from './ensure'

const mocks = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
  ensureWorkspace: vi.fn(),
  generateId: vi.fn(),
  loadManifest: vi.fn(),
  loadApplicationManifest: vi.fn(),
  nowUnixSeconds: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mocks.prismaRef.current
  },
}))
vi.mock('@/lib/id', () => ({ generateId: mocks.generateId }))
vi.mock('@/lib/provisioning/manifest', () => ({
  loadBillingProvisioningManifest: mocks.loadManifest,
  loadBillingApplicationProvisioningManifest: mocks.loadApplicationManifest,
}))
vi.mock('@876/core/timestamps', () => ({
  nowUnixSeconds: mocks.nowUnixSeconds,
}))
vi.mock('../tenants/workspace', () => ({
  ensureWorkspace: mocks.ensureWorkspace,
  ProvisioningInputError: class ProvisioningInputError extends Error {},
}))

const NOW = 1_783_771_200

function event(
  overrides: Partial<FinanceProvisioningEvent> = {}
): FinanceProvisioningEvent {
  return {
    eventId: 'fpe_1',
    eventType: 'finance_connection.ensure',
    contractVersion: 1,
    aggregateId: 'sub_1',
    organization: {
      id: 'org_1',
      name: 'Efesto Technologies',
      slug: 'efesto',
      countryCode: 'JM',
      currencyCode: 'JMD',
    },
    sourceAppId: 'rap_couriers',
    entitlementReference: 'sub_1',
    manifestVersion: 1,
    provisioningRevision: 2,
    lifecycleVersion: 1,
    desiredStatus: 'ACTIVE',
    scopes: ['billing.customers.read', 'billing.invoices.write'],
    occurredAt: NOW,
    ...overrides,
  }
}

describe('finance connection provisioning inbox', () => {
  let tx: {
    financeProvisioningInbox: {
      findUnique: ReturnType<typeof vi.fn>
      create: ReturnType<typeof vi.fn>
    }
    appFinanceConnection: {
      findUnique: ReturnType<typeof vi.fn>
      create: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    tx = {
      financeProvisioningInbox: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(async ({ data }) => data),
      },
      appFinanceConnection: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(async ({ data }) => data),
        update: vi.fn(async ({ where, data }) => ({
          id: where.id,
          tenantId: 'ten_1',
          ...data,
        })),
      },
    }
    mocks.prismaRef.current = {
      $transaction: vi.fn(
        async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx)
      ),
    }
    mocks.ensureWorkspace.mockResolvedValue({
      id: 'ten_1',
      created: true,
      provisioningVersion: 3,
      ownerRoleId: 'role_owner',
      adminRoleId: 'role_admin',
    })
    mocks.generateId.mockReturnValue('afc_1')
    mocks.loadManifest.mockResolvedValue({
      manifestVersion: 1,
      revision: 3,
      defaults: {},
    })
    mocks.loadApplicationManifest.mockResolvedValue({
      manifestVersion: 1,
      revision: 1,
      documentPreferences: [],
    })
    mocks.nowUnixSeconds.mockReturnValue(NOW)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a headless workspace connection and durable receipt', async () => {
    const payload = event()
    const result = await ensure(payload)

    expect(result).toEqual({
      data: {
        id: 'afc_1',
        tenantId: 'ten_1',
        status: 'ACTIVE',
        lifecycleVersion: 1,
        applied: true,
        duplicate: false,
      },
      error: null,
    })
    expect(mocks.ensureWorkspace).toHaveBeenCalledWith(
      tx,
      expect.anything(),
      expect.objectContaining({ organizationId: 'org_1' }),
      NOW,
      expect.objectContaining({ revision: 1 })
    )
    expect(tx.appFinanceConnection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'afc_1',
        tenantId: 'ten_1',
        status: 'ACTIVE',
        activatedAt: NOW,
      }),
    })
    expect(tx.financeProvisioningInbox.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId: 'fpe_1',
        connectionId: 'afc_1',
        applied: true,
      }),
    })
  })

  it('reuses the provisioning manifests when a unique conflict is retried', async () => {
    const prisma = mocks.prismaRef.current as {
      $transaction: ReturnType<typeof vi.fn>
    }
    prisma.$transaction
      .mockRejectedValueOnce({ code: 'P2002' })
      .mockImplementation(
        async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx)
      )

    const result = await ensure(event())

    expect(result.error).toBeNull()
    expect(prisma.$transaction).toHaveBeenCalledTimes(2)
    expect(mocks.loadManifest).toHaveBeenCalledTimes(1)
    expect(mocks.loadApplicationManifest).toHaveBeenCalledTimes(1)
    expect(mocks.ensureWorkspace).toHaveBeenCalledTimes(1)
  })

  it('returns an existing receipt for an identical delivery', async () => {
    const payload = event()
    tx.financeProvisioningInbox.findUnique.mockResolvedValue({
      eventId: payload.eventId,
      payloadHash: createHash('sha256')
        .update(JSON.stringify(payload))
        .digest('hex'),
      connectionId: 'afc_1',
      applied: true,
    })
    tx.appFinanceConnection.findUnique.mockResolvedValue({
      id: 'afc_1',
      tenantId: 'ten_1',
      status: 'ACTIVE',
      lifecycleVersion: 1,
    })

    const result = await ensure(payload)

    expect(result.data).toMatchObject({ duplicate: true, applied: true })
    expect(mocks.ensureWorkspace).not.toHaveBeenCalled()
    expect(tx.financeProvisioningInbox.create).not.toHaveBeenCalled()
  })

  it('records but does not apply an out-of-order older lifecycle event', async () => {
    tx.appFinanceConnection.findUnique.mockResolvedValue({
      id: 'afc_1',
      tenantId: 'ten_1',
      sourceAppId: 'rap_couriers',
      status: 'REVOKED',
      scopes: ['billing.customers.read'],
      entitlementReference: 'sub_1',
      provisioningVersion: 3,
      lifecycleVersion: 3,
    })

    const result = await ensure(
      event({
        eventId: 'fpe_old',
        lifecycleVersion: 2,
        desiredStatus: 'ACTIVE',
      })
    )

    expect(result.data).toMatchObject({
      status: 'REVOKED',
      lifecycleVersion: 3,
      applied: false,
    })
    expect(tx.appFinanceConnection.update).not.toHaveBeenCalled()
    expect(tx.financeProvisioningInbox.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ applied: false, lifecycleVersion: 2 }),
    })
  })

  it('rejects conflicting content for an already applied lifecycle revision', async () => {
    tx.appFinanceConnection.findUnique.mockResolvedValue({
      id: 'afc_1',
      tenantId: 'ten_1',
      sourceAppId: 'rap_couriers',
      status: 'ACTIVE',
      scopes: ['billing.customers.read'],
      entitlementReference: 'sub_1',
      provisioningVersion: 2,
      lifecycleVersion: 1,
    })

    const result = await ensure(event())

    expect(result).toEqual({
      data: null,
      error:
        'This lifecycle version conflicts with the current finance connection.',
      status: 409,
    })
    expect(tx.financeProvisioningInbox.create).not.toHaveBeenCalled()
  })
})
