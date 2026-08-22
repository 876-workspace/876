import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FinanceProvisioningEvent } from '@876/server/finance-provisioning'

const mocks = vi.hoisted(() => ({
  $transaction: vi.fn(),
  provisionTenantWorkspace: vi.fn(),
  inboxFindUnique: vi.fn(),
  inboxCreate: vi.fn(),
  connectionFindUnique: vi.fn(),
  connectionCreate: vi.fn(),
  connectionUpdate: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: { $transaction: mocks.$transaction },
}))

vi.mock('@/modules/tenants', () => ({
  provisionTenantWorkspace: mocks.provisionTenantWorkspace,
}))

import {
  applyFinanceProvisioningEvent,
  FinanceConnectionLifecycleConflict,
} from '../finance-connections.repository'

function event(
  overrides: Partial<FinanceProvisioningEvent> = {}
): FinanceProvisioningEvent {
  return {
    eventId: 'fpe_001',
    eventType: 'finance_connection.ensure',
    contractVersion: 1,
    aggregateId: 'org_1:app_1',
    organization: {
      id: 'org_1',
      name: 'Test Org',
      slug: 'test-org',
      countryCode: 'JM',
      currencyCode: 'JMD',
    },
    sourceAppId: 'app_1',
    entitlementReference: 'sub_1',
    manifestVersion: 1,
    provisioningRevision: 2,
    lifecycleVersion: 3,
    desiredStatus: 'ACTIVE',
    scopes: ['billing.customers.read', 'billing.customers.write'],
    occurredAt: 1_787_000_000,
    ...overrides,
  }
}

const NOW = 1_787_050_000

const connection = {
  id: 'afc_1',
  tenantId: 'ten_1',
  sourceAppId: 'app_1',
  status: 'ACTIVE',
  scopes: ['billing.customers.read', 'billing.customers.write'],
  entitlementReference: 'sub_1',
  provisioningVersion: 2,
  lifecycleVersion: 3,
}

function createTx() {
  return {
    financeProvisioningInbox: {
      findUnique: mocks.inboxFindUnique,
      create: mocks.inboxCreate,
    },
    appFinanceConnection: {
      findUnique: mocks.connectionFindUnique,
      create: mocks.connectionCreate,
      update: mocks.connectionUpdate,
    },
  }
}

describe('applyFinanceProvisioningEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.$transaction.mockImplementation(async (cb) => cb(createTx()))
    mocks.provisionTenantWorkspace.mockResolvedValue({
      id: 'ten_1',
      created: true,
      provisioningVersion: 3,
    })
    mocks.inboxFindUnique.mockResolvedValue(null)
    mocks.connectionFindUnique.mockResolvedValue(null)
    mocks.connectionCreate.mockResolvedValue(connection)
    mocks.connectionUpdate.mockResolvedValue(connection)
    mocks.inboxCreate.mockResolvedValue({
      eventId: 'fpe_001',
      payloadHash: 'hash',
      applied: true,
      connectionId: 'afc_1',
    })
  })

  // ── Workspace delegation ──────────────────────────────────────────────

  it('delegates workspace creation to provisionTenantWorkspace with the org data from the event', async () => {
    const e = event()

    await applyFinanceProvisioningEvent(e, 'hash', NOW)

    expect(mocks.provisionTenantWorkspace).toHaveBeenCalledWith(
      expect.any(Object),
      {
        organizationId: 'org_1',
        name: 'Test Org',
        slug: 'test-org',
        countryCode: 'JM',
        defaultCurrency: 'JMD',
        now: NOW,
      }
    )
  })

  it('passes a null countryCode through to provisionTenantWorkspace', async () => {
    const e = event({
      organization: {
        id: 'org_1',
        name: 'Test Org',
        slug: 'test-org',
        countryCode: null,
        currencyCode: 'JMD',
      },
    })

    await applyFinanceProvisioningEvent(e, 'hash', NOW)

    expect(mocks.provisionTenantWorkspace).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ countryCode: null })
    )
  })

  // ── Duplicate eventId ─────────────────────────────────────────────────

  it('returns the existing receipt and connection as a duplicate when the eventId is already in the inbox', async () => {
    const existingReceipt = {
      eventId: 'fpe_001',
      payloadHash: 'existing-hash',
      applied: false,
      connectionId: 'afc_1',
    }
    mocks.inboxFindUnique.mockResolvedValue(existingReceipt)
    mocks.connectionFindUnique.mockResolvedValue(connection)

    const result = await applyFinanceProvisioningEvent(event(), 'new-hash', NOW)

    expect(result.duplicate).toBe(true)
    expect(result.receipt).toBe(existingReceipt)
    expect(result.connection).toBe(connection)
    expect(mocks.inboxCreate).not.toHaveBeenCalled()
    expect(mocks.connectionCreate).not.toHaveBeenCalled()
    expect(mocks.connectionUpdate).not.toHaveBeenCalled()
    expect(mocks.provisionTenantWorkspace).not.toHaveBeenCalled()
  })

  it('finds the existing connection by receipt.connectionId in the duplicate path', async () => {
    mocks.inboxFindUnique.mockResolvedValue({
      eventId: 'fpe_001',
      payloadHash: 'hash',
      applied: false,
      connectionId: 'afc_existing',
    })
    mocks.connectionFindUnique.mockResolvedValue(connection)

    await applyFinanceProvisioningEvent(event(), 'hash', NOW)

    expect(mocks.connectionFindUnique).toHaveBeenCalledWith({
      where: { id: 'afc_existing' },
    })
  })

  it('returns a null connection in the duplicate path when the connection was deleted', async () => {
    mocks.inboxFindUnique.mockResolvedValue({
      eventId: 'fpe_001',
      payloadHash: 'hash',
      applied: false,
      connectionId: 'afc_deleted',
    })
    mocks.connectionFindUnique.mockResolvedValue(null)

    const result = await applyFinanceProvisioningEvent(event(), 'hash', NOW)

    expect(result.duplicate).toBe(true)
    expect(result.connection).toBeNull()
  })

  // ── New connection ────────────────────────────────────────────────────

  it('creates a new connection when none exists', async () => {
    const e = event({ desiredStatus: 'ACTIVE' })

    await applyFinanceProvisioningEvent(e, 'hash', NOW)

    expect(mocks.connectionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'ten_1',
        sourceAppId: 'app_1',
        status: 'ACTIVE',
        scopes: ['billing.customers.read', 'billing.customers.write'],
        entitlementReference: 'sub_1',
        provisioningVersion: 2,
        lifecycleVersion: 3,
        activatedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    })
    expect(mocks.connectionUpdate).not.toHaveBeenCalled()
  })

  it.each([
    ['ACTIVE', 'activatedAt'],
    ['SUSPENDED', 'suspendedAt'],
    ['REVOKED', 'revokedAt'],
  ] as const)(
    'sets %s timestamp on create for desiredStatus %s',
    async (desiredStatus, timestampField) => {
      await applyFinanceProvisioningEvent(event({ desiredStatus }), 'hash', NOW)

      const data = mocks.connectionCreate.mock.calls[0]![0].data
      expect(data[timestampField]).toBe(NOW)
    }
  )

  // ── Existing connection update ────────────────────────────────────────

  it('updates an existing connection when the event lifecycleVersion is newer', async () => {
    mocks.connectionFindUnique.mockResolvedValue({
      ...connection,
      lifecycleVersion: 2,
      status: 'SUSPENDED',
    })

    const e = event({ lifecycleVersion: 3, desiredStatus: 'ACTIVE' })

    await applyFinanceProvisioningEvent(e, 'hash', NOW)

    expect(mocks.connectionUpdate).toHaveBeenCalledWith({
      where: { id: 'afc_1' },
      data: expect.objectContaining({
        status: 'ACTIVE',
        scopes: ['billing.customers.read', 'billing.customers.write'],
        entitlementReference: 'sub_1',
        provisioningVersion: 2,
        lifecycleVersion: 3,
        activatedAt: NOW,
        updatedAt: NOW,
      }),
    })
    expect(mocks.connectionCreate).not.toHaveBeenCalled()
  })

  it('updates the connection from REVOKED to ACTIVE with activatedAt', async () => {
    mocks.connectionFindUnique.mockResolvedValue({
      ...connection,
      lifecycleVersion: 2,
      status: 'REVOKED',
    })

    await applyFinanceProvisioningEvent(
      event({ lifecycleVersion: 3, desiredStatus: 'ACTIVE' }),
      'hash',
      NOW
    )

    expect(mocks.connectionUpdate).toHaveBeenCalledWith({
      where: { id: 'afc_1' },
      data: expect.objectContaining({
        status: 'ACTIVE',
        activatedAt: NOW,
      }),
    })
  })

  // ── Same-lifecycle conflict ───────────────────────────────────────────

  it('throws FinanceConnectionLifecycleConflict on same-lifecycle status mismatch', async () => {
    mocks.connectionFindUnique.mockResolvedValue({
      ...connection,
      lifecycleVersion: 3,
      status: 'SUSPENDED',
    })

    await expect(
      applyFinanceProvisioningEvent(event(), 'hash', NOW)
    ).rejects.toBeInstanceOf(FinanceConnectionLifecycleConflict)
  })

  it('throws FinanceConnectionLifecycleConflict on same-lifecycle scopes mismatch', async () => {
    mocks.connectionFindUnique.mockResolvedValue({
      ...connection,
      lifecycleVersion: 3,
      status: 'ACTIVE',
      scopes: ['billing.invoices.write'],
    })

    await expect(
      applyFinanceProvisioningEvent(event(), 'hash', NOW)
    ).rejects.toBeInstanceOf(FinanceConnectionLifecycleConflict)
  })

  it('throws conflict on same-lifecycle entitlementReference mismatch', async () => {
    mocks.connectionFindUnique.mockResolvedValue({
      ...connection,
      lifecycleVersion: 3,
      status: 'ACTIVE',
      entitlementReference: 'sub_different',
    })

    await expect(
      applyFinanceProvisioningEvent(event(), 'hash', NOW)
    ).rejects.toBeInstanceOf(FinanceConnectionLifecycleConflict)
  })

  it('throws conflict on same-lifecycle provisioningVersion mismatch', async () => {
    mocks.connectionFindUnique.mockResolvedValue({
      ...connection,
      lifecycleVersion: 3,
      status: 'ACTIVE',
      provisioningVersion: 99,
    })

    await expect(
      applyFinanceProvisioningEvent(event(), 'hash', NOW)
    ).rejects.toBeInstanceOf(FinanceConnectionLifecycleConflict)
  })

  // ── No-op cases ───────────────────────────────────────────────────────

  it('is a no-op when same-lifecycle and all state matches, but still writes a receipt', async () => {
    mocks.connectionFindUnique.mockResolvedValue({
      ...connection,
      lifecycleVersion: 3,
      status: 'ACTIVE',
    })

    const result = await applyFinanceProvisioningEvent(event(), 'hash', NOW)

    expect(mocks.connectionCreate).not.toHaveBeenCalled()
    expect(mocks.connectionUpdate).not.toHaveBeenCalled()
    expect(result.duplicate).toBe(false)
    expect(mocks.inboxCreate).toHaveBeenCalledOnce()
    const receiptData = mocks.inboxCreate.mock.calls[0]![0].data
    expect(receiptData.applied).toBe(false)
  })

  it('is a no-op for a stale replay (lifecycleVersion below current) but still writes a receipt', async () => {
    mocks.connectionFindUnique.mockResolvedValue({
      ...connection,
      lifecycleVersion: 5,
      status: 'SUSPENDED',
    })

    const result = await applyFinanceProvisioningEvent(event(), 'hash', NOW)

    expect(mocks.connectionCreate).not.toHaveBeenCalled()
    expect(mocks.connectionUpdate).not.toHaveBeenCalled()
    expect(result.duplicate).toBe(false)
    expect(mocks.inboxCreate).toHaveBeenCalledOnce()
    const receiptData = mocks.inboxCreate.mock.calls[0]![0].data
    expect(receiptData.applied).toBe(false)
  })

  // ── Receipt creation ──────────────────────────────────────────────────

  it('writes the inbox receipt with the correct fields', async () => {
    const e = event()

    await applyFinanceProvisioningEvent(e, 'sha256-payload-hash', NOW)

    expect(mocks.inboxCreate).toHaveBeenCalledWith({
      data: {
        eventId: 'fpe_001',
        eventType: 'finance_connection.ensure',
        contractVersion: 1,
        payloadHash: 'sha256-payload-hash',
        aggregateId: 'org_1:app_1',
        organizationId: 'org_1',
        sourceAppId: 'app_1',
        connectionId: 'afc_1',
        provisioningVersion: 2,
        lifecycleVersion: 3,
        applied: true,
        processedAt: NOW,
        createdAt: NOW,
      },
    })
  })

  it('does not write a receipt in the duplicate path', async () => {
    mocks.inboxFindUnique.mockResolvedValue({
      eventId: 'fpe_001',
      payloadHash: 'hash',
      applied: false,
      connectionId: 'afc_1',
    })
    mocks.connectionFindUnique.mockResolvedValue(connection)

    await applyFinanceProvisioningEvent(event(), 'hash', NOW)

    expect(mocks.inboxCreate).not.toHaveBeenCalled()
  })
})
