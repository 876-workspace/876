import type { Mocked } from '@/test/mocked'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CUSTOMER_EVENT_TYPE,
  customerEventPayload,
  enqueueCustomerEnsureForOrganization,
  enqueueCustomerEnsureForUser,
  enqueueReconcileAll,
  snapshotForOrganization,
  snapshotForUser,
} from '../billing-customer-sync'
import type {
  BillingCustomerSyncDeps,
  BillingCustomerSyncRepository,
  BillingCustomerOutboxRow,
} from '../billing-customer-sync'

const NOW = 1_700_000_000

function makeRepository(
  overrides: Partial<BillingCustomerSyncRepository> = {}
): Mocked<BillingCustomerSyncRepository> {
  return {
    findUserById: vi.fn(),
    listMembershipsByOrganizationId: vi.fn(),
    findLatestOutboxBySubject: vi.fn(),
    createOutboxEvent: vi.fn(),
    updateOutboxEvent: vi.fn(),
    listOrganizations: vi.fn(),
    listKnownUserIds: vi.fn(),
    ...overrides,
  } as unknown as Mocked<BillingCustomerSyncRepository>
}

function organization(overrides: Record<string, unknown> = {}) {
  return {
    id: 'org_1',
    name: 'Efesto Technologies',
    slug: 'efesto',
    doingBusinessAs: null,
    primaryEmail: null,
    primaryPhone: null,
    primaryContactUserId: null,
    ...overrides,
  }
}

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user_1',
    email: 'ada@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    name: null,
    username: null,
    phone: null,
    ...overrides,
  }
}

function membership(role = 'owner', userId = 'user_1', createdAt = 10n) {
  return {
    id: `mem_${userId}`,
    organizationId: 'org_1',
    userId,
    role,
    createdAt,
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW * 1000)
  return () => vi.useRealTimers()
})

describe('snapshotForOrganization', () => {
  it('uses owner as primary contact', async () => {
    const repo = makeRepository()
    repo.listMembershipsByOrganizationId.mockResolvedValue([
      membership() as never,
    ])
    repo.findUserById.mockResolvedValue(user() as never)

    const snapshot = await snapshotForOrganization(
      { repository: repo },
      organization() as never
    )

    expect(snapshot.customerKind).toBe('BUSINESS')
    expect(snapshot.companyName).toBe('Efesto Technologies')
    expect(snapshot.contactUserId).toBe('user_1')
    expect(snapshot.contactFirstName).toBe('Ada')
    expect(snapshot.contactLastName).toBe('Lovelace')
    expect(snapshot.contactEmail).toBe('ada@example.com')
    // Party first/last mirror the contact
    expect(snapshot.firstName).toBe('Ada')
    expect(snapshot.lastName).toBe('Lovelace')
  })

  it('prefers declared primary contact without consulting memberships', async () => {
    const declared = user({
      id: 'user_2',
      email: 'grace@example.com',
      firstName: 'Grace',
      lastName: 'Hopper',
    })
    const repo = makeRepository()
    repo.findUserById.mockResolvedValue(declared as never)

    const snapshot = await snapshotForOrganization(
      { repository: repo },
      organization({ primaryContactUserId: 'user_2' }) as never
    )

    expect(snapshot.contactUserId).toBe('user_2')
    expect(snapshot.contactEmail).toBe('grace@example.com')
    expect(repo.listMembershipsByOrganizationId).not.toHaveBeenCalled()
  })

  it('falls back to earliest member when no owner', async () => {
    const repo = makeRepository()
    repo.listMembershipsByOrganizationId.mockResolvedValue([
      membership('admin', 'user_1') as never,
    ])
    repo.findUserById.mockResolvedValue(user() as never)

    const snapshot = await snapshotForOrganization(
      { repository: repo },
      organization() as never
    )
    expect(snapshot.contactUserId).toBe('user_1')
  })

  it('never fabricates a contact when org has no members', async () => {
    const repo = makeRepository()
    repo.listMembershipsByOrganizationId.mockResolvedValue([])

    const snapshot = await snapshotForOrganization(
      { repository: repo },
      organization() as never
    )
    expect(snapshot.contactUserId).toBeNull()
    expect(snapshot.contactEmail).toBeNull()
    expect(snapshot.companyName).toBe('Efesto Technologies')
  })

  it('prefers trading name for display name', async () => {
    const repo = makeRepository()
    repo.listMembershipsByOrganizationId.mockResolvedValue([])

    const snapshot = await snapshotForOrganization(
      { repository: repo },
      organization({
        doingBusinessAs: 'Efesto',
        primaryEmail: 'ap@efesto.test',
      }) as never
    )

    expect(snapshot.name).toBe('Efesto')
    expect(snapshot.companyName).toBe('Efesto Technologies')
    expect(snapshot.email).toBe('ap@efesto.test')
  })

  it('falls back to contact email when org has no primary email', async () => {
    const repo = makeRepository()
    repo.listMembershipsByOrganizationId.mockResolvedValue([
      membership() as never,
    ])
    repo.findUserById.mockResolvedValue(user() as never)

    const snapshot = await snapshotForOrganization(
      { repository: repo },
      organization() as never
    )
    expect(snapshot.email).toBe('ada@example.com')
  })

  it('prefers owner over earlier admin', async () => {
    const admin = membership('admin', 'user_admin', 5n)
    const owner = membership('owner', 'user_owner', 10n)
    const repo = makeRepository()
    repo.listMembershipsByOrganizationId.mockResolvedValue([
      admin as never,
      owner as never,
    ])
    repo.findUserById.mockImplementation(async (id: string) => {
      if (id === 'user_owner')
        return user({ id: 'user_owner', firstName: 'Owner' }) as never
      return user({ id: 'user_admin', firstName: 'Admin' }) as never
    })

    const snapshot = await snapshotForOrganization(
      { repository: repo },
      organization() as never
    )
    expect(snapshot.contactUserId).toBe('user_owner')
  })
})

describe('snapshotForUser', () => {
  it('is individual with no separate contact', () => {
    const snapshot = snapshotForUser(user({ phone: '+18765550111' }) as never)
    expect(snapshot.subjectType).toBe('user')
    expect(snapshot.subjectId).toBe('user_1')
    expect(snapshot.customerKind).toBe('INDIVIDUAL')
    expect(snapshot.name).toBe('Ada Lovelace')
    expect(snapshot.email).toBe('ada@example.com')
    expect(snapshot.firstName).toBe('Ada')
    expect(snapshot.lastName).toBe('Lovelace')
    expect(snapshot.phone).toBe('+18765550111')
    expect(snapshot.companyName).toBeNull()
    expect(snapshot.contactUserId).toBeNull()
    expect(snapshot.contactEmail).toBeNull()
  })

  it('prefers explicit name over first/last', () => {
    const snapshot = snapshotForUser(
      user({ name: 'Countess of Lovelace' }) as never
    )
    expect(snapshot.name).toBe('Countess of Lovelace')
  })

  it('falls back to username then email then id', () => {
    const byUsername = snapshotForUser(
      user({
        firstName: null,
        lastName: null,
        email: null,
        username: 'ada',
        name: null,
      }) as never
    )
    const byEmail = snapshotForUser(
      user({
        firstName: null,
        lastName: null,
        email: 'ada@example.com',
        username: null,
        name: null,
      }) as never
    )
    const byId = snapshotForUser(
      user({
        firstName: null,
        lastName: null,
        email: null,
        username: null,
        name: null,
      }) as never
    )

    expect(byUsername.name).toBe('ada')
    expect(byEmail.name).toBe('ada@example.com')
    expect(byId.name).toBe('user_1')
  })

  it('ignores blank name parts', () => {
    const snapshot = snapshotForUser(
      user({
        firstName: '  ',
        lastName: 'Lovelace',
        email: null,
        name: null,
      }) as never
    )
    expect(snapshot.name).toBe('Lovelace')
  })
})

describe('customerEventPayload', () => {
  it('matches billing contract for organization and user', () => {
    const organizationEvent: BillingCustomerOutboxRow = {
      id: 'bce_1',
      eventType: CUSTOMER_EVENT_TYPE,
      subjectType: 'organization',
      subjectId: 'org_1',
      name: 'Efesto',
      email: 'ap@efesto.test',
      customerKind: 'BUSINESS',
      companyName: 'Efesto Technologies',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '+18761234567',
      contactUserId: 'user_1',
      contactFirstName: 'Ada',
      contactLastName: 'Lovelace',
      contactEmail: 'ada@example.com',
      contactPhone: null,
      payloadHash: 'hash',
      occurredAt: BigInt(1_700_000_000),
      status: 'pending',
      attemptCount: 0,
      availableAt: BigInt(1_700_000_000),
      lockedAt: null,
      deliveredAt: null,
      lastError: null,
      createdAt: BigInt(1_700_000_000),
      updatedAt: BigInt(1_700_000_000),
    }

    const userEvent: BillingCustomerOutboxRow = {
      companyName: null,
      id: 'bce_2',
      eventType: CUSTOMER_EVENT_TYPE,
      subjectType: 'user',
      subjectId: 'user_1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      customerKind: 'INDIVIDUAL',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: null,
      contactUserId: null,
      contactFirstName: null,
      contactLastName: null,
      contactEmail: null,
      contactPhone: null,
      payloadHash: 'hash',
      occurredAt: BigInt(1_700_000_000),
      status: 'pending',
      attemptCount: 0,
      availableAt: BigInt(1_700_000_000),
      lockedAt: null,
      deliveredAt: null,
      lastError: null,
      createdAt: BigInt(1_700_000_000),
      updatedAt: BigInt(1_700_000_000),
    }

    expect(customerEventPayload(organizationEvent)).toEqual({
      customerType: 'CORE_ORGANIZATION',
      customerKind: 'BUSINESS',
      organizationId: 'org_1',
      name: 'Efesto',
      companyName: 'Efesto Technologies',
      email: 'ap@efesto.test',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '+18761234567',
      primaryContact: {
        userId: 'user_1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: null,
      },
    })

    expect(customerEventPayload(userEvent)).toEqual({
      customerType: 'CORE_USER',
      customerKind: 'INDIVIDUAL',
      userId: 'user_1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: null,
    })
  })

  it('omits contact when unresolved', () => {
    const event: BillingCustomerOutboxRow = {
      id: 'bce_1',
      eventType: CUSTOMER_EVENT_TYPE,
      subjectType: 'organization',
      subjectId: 'org_1',
      name: 'Efesto Technologies',
      email: null,
      customerKind: 'BUSINESS',
      companyName: 'Efesto Technologies',
      firstName: null,
      lastName: null,
      phone: null,
      contactUserId: null,
      contactFirstName: null,
      contactLastName: null,
      contactEmail: null,
      contactPhone: null,
      payloadHash: null,
      occurredAt: BigInt(1_700_000_000),
      status: 'pending',
      attemptCount: 0,
      availableAt: BigInt(1_700_000_000),
      lockedAt: null,
      deliveredAt: null,
      lastError: null,
      createdAt: BigInt(1_700_000_000),
      updatedAt: BigInt(1_700_000_000),
    }
    expect(customerEventPayload(event).primaryContact).toBeNull()
  })

  it('legacy event without snapshot still serializes', () => {
    const event = {
      subjectType: 'organization',
      subjectId: 'org_1',
      name: 'Efesto',
      email: null,
      customerKind: null,
      companyName: null,
      firstName: null,
      lastName: null,
      phone: null,
      contactUserId: null,
      contactFirstName: null,
      contactLastName: null,
      contactEmail: null,
      contactPhone: null,
    } as BillingCustomerOutboxRow

    const payload = customerEventPayload(event)
    expect(payload.customerKind).toBe('BUSINESS')
    expect(payload.customerType).toBe('CORE_ORGANIZATION')
    expect(payload.primaryContact).toBeNull()
  })
})

describe('enqueueCustomerEnsureForOrganization', () => {
  it('creates pending event with full snapshot on first call', async () => {
    const repo = makeRepository()
    repo.listMembershipsByOrganizationId.mockResolvedValue([
      membership() as never,
    ])
    repo.findUserById.mockResolvedValue(user() as never)
    repo.findLatestOutboxBySubject.mockResolvedValue(null)
    repo.createOutboxEvent.mockImplementation(async (data) => data)

    await enqueueCustomerEnsureForOrganization(
      { repository: repo },
      organization() as never,
      NOW
    )

    expect(repo.createOutboxEvent).toHaveBeenCalledOnce()
    const data = repo.createOutboxEvent.mock
      .calls[0]?.[0] as BillingCustomerOutboxRow
    expect(data.id.startsWith('bce_')).toBe(true)
    expect(data.subjectType).toBe('organization')
    expect(data.subjectId).toBe('org_1')
    expect(data.status).toBe('pending')
    expect(data.customerKind).toBe('BUSINESS')
    expect(data.name).toBe('Efesto Technologies')
  })

  it('deduplicates pending event with same hash', async () => {
    const repo = makeRepository()
    const pending: BillingCustomerOutboxRow = {
      id: 'bce_existing',
      eventType: CUSTOMER_EVENT_TYPE,
      subjectType: 'organization',
      subjectId: 'org_1',
      name: 'Efesto Technologies',
      email: 'ada@example.com',
      customerKind: 'BUSINESS',
      companyName: 'Efesto Technologies',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: null,
      contactUserId: 'user_1',
      contactFirstName: 'Ada',
      contactLastName: 'Lovelace',
      contactEmail: 'ada@example.com',
      contactPhone: null,
      payloadHash: 'placeholder',
      occurredAt: BigInt(NOW),
      status: 'pending',
      attemptCount: 0,
      availableAt: BigInt(NOW),
      lockedAt: null,
      deliveredAt: null,
      lastError: null,
      createdAt: BigInt(NOW),
      updatedAt: BigInt(NOW),
    }

    // First call creates
    repo.listMembershipsByOrganizationId.mockResolvedValue([
      membership() as never,
    ])
    repo.findUserById.mockResolvedValue(user() as never)
    repo.findLatestOutboxBySubject.mockResolvedValueOnce(null)
    repo.createOutboxEvent.mockImplementation(async (data) => {
      pending.payloadHash = data.payloadHash
      return data
    })

    await enqueueCustomerEnsureForOrganization(
      { repository: repo },
      organization() as never,
      NOW
    )
    expect(repo.createOutboxEvent).toHaveBeenCalledTimes(1)

    // Second call with same snapshot -> should not create again, and not update
    repo.findLatestOutboxBySubject.mockResolvedValue(pending as never)
    repo.updateOutboxEvent.mockResolvedValue(pending as never)

    await enqueueCustomerEnsureForOrganization(
      { repository: repo },
      organization() as never,
      NOW
    )
    expect(repo.createOutboxEvent).toHaveBeenCalledTimes(1)
    expect(repo.updateOutboxEvent).not.toHaveBeenCalled()
  })

  it('refreshes pending event when snapshot changes', async () => {
    const repo = makeRepository()
    const pending: BillingCustomerOutboxRow = {
      id: 'bce_existing',
      eventType: CUSTOMER_EVENT_TYPE,
      subjectType: 'organization',
      subjectId: 'org_1',
      name: 'Efesto Technologies',
      email: 'ada@example.com',
      customerKind: 'BUSINESS',
      companyName: 'Efesto Technologies',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: null,
      contactUserId: 'user_1',
      contactFirstName: 'Ada',
      contactLastName: 'Lovelace',
      contactEmail: 'ada@example.com',
      contactPhone: null,
      payloadHash: 'old_hash',
      occurredAt: BigInt(NOW),
      status: 'pending',
      attemptCount: 0,
      availableAt: BigInt(NOW),
      lockedAt: null,
      deliveredAt: null,
      lastError: null,
      createdAt: BigInt(NOW),
      updatedAt: BigInt(NOW),
    }

    repo.listMembershipsByOrganizationId.mockResolvedValue([
      membership() as never,
    ])
    repo.findUserById.mockResolvedValue(user({ lastName: 'Byron' }) as never)
    repo.findLatestOutboxBySubject.mockResolvedValue(pending as never)
    repo.updateOutboxEvent.mockImplementation(async (_id, data) => {
      Object.assign(pending, data)
      return pending as never
    })

    await enqueueCustomerEnsureForOrganization(
      { repository: repo },
      organization() as never,
      NOW + 100
    )

    expect(repo.createOutboxEvent).not.toHaveBeenCalled()
    expect(repo.updateOutboxEvent).toHaveBeenCalledOnce()
    expect(pending.contactLastName).toBe('Byron')
  })

  it('skips delivered event with unchanged snapshot', async () => {
    const repo = makeRepository()
    // Create a delivered event first to capture its hash
    let deliveredHash: string | null = null
    repo.listMembershipsByOrganizationId.mockResolvedValue([
      membership() as never,
    ])
    repo.findUserById.mockResolvedValue(user() as never)
    repo.findLatestOutboxBySubject.mockResolvedValueOnce(null)
    repo.createOutboxEvent.mockImplementation(async (data) => {
      deliveredHash = data.payloadHash
      return {
        ...data,
        status: 'delivered',
        payloadHash: deliveredHash,
      } as BillingCustomerOutboxRow
    })
    await enqueueCustomerEnsureForOrganization(
      { repository: repo },
      organization() as never,
      NOW
    )

    const delivered: BillingCustomerOutboxRow = {
      id: 'bce_delivered',
      eventType: CUSTOMER_EVENT_TYPE,
      subjectType: 'organization',
      subjectId: 'org_1',
      name: 'Efesto Technologies',
      email: 'ada@example.com',
      customerKind: 'BUSINESS',
      companyName: 'Efesto Technologies',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: null,
      contactUserId: 'user_1',
      contactFirstName: 'Ada',
      contactLastName: 'Lovelace',
      contactEmail: 'ada@example.com',
      contactPhone: null,
      payloadHash: deliveredHash,
      occurredAt: BigInt(NOW),
      status: 'delivered',
      attemptCount: 1,
      availableAt: BigInt(NOW),
      lockedAt: null,
      deliveredAt: BigInt(NOW),
      lastError: null,
      createdAt: BigInt(NOW),
      updatedAt: BigInt(NOW),
    }

    repo.findLatestOutboxBySubject.mockResolvedValue(delivered as never)
    // Second call with same snapshot must not create
    await enqueueCustomerEnsureForOrganization(
      { repository: repo },
      organization() as never,
      NOW + 100
    )
    // create was called once total (the initial), not again
    expect(repo.createOutboxEvent).toHaveBeenCalledTimes(1)
  })

  it('emits new event when snapshot changes after delivered', async () => {
    const repo = makeRepository()
    let firstHash: string | null = null
    repo.listMembershipsByOrganizationId.mockResolvedValue([
      membership() as never,
    ])
    repo.findUserById.mockResolvedValue(user() as never)
    repo.findLatestOutboxBySubject.mockResolvedValueOnce(null)
    repo.createOutboxEvent.mockImplementation(async (data) => {
      firstHash = data.payloadHash
      return data
    })
    await enqueueCustomerEnsureForOrganization(
      { repository: repo },
      organization() as never,
      NOW
    )

    const delivered: BillingCustomerOutboxRow = {
      id: 'bce_delivered',
      eventType: CUSTOMER_EVENT_TYPE,
      subjectType: 'organization',
      subjectId: 'org_1',
      name: 'Efesto Technologies',
      email: 'ada@example.com',
      customerKind: 'BUSINESS',
      companyName: 'Efesto Technologies',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: null,
      contactUserId: 'user_1',
      contactFirstName: 'Ada',
      contactLastName: 'Lovelace',
      contactEmail: 'ada@example.com',
      contactPhone: null,
      payloadHash: firstHash,
      occurredAt: BigInt(NOW),
      status: 'delivered',
      attemptCount: 1,
      availableAt: BigInt(NOW),
      lockedAt: null,
      deliveredAt: BigInt(NOW),
      lastError: null,
      createdAt: BigInt(NOW),
      updatedAt: BigInt(NOW),
    }

    // Change snapshot
    repo.findUserById.mockResolvedValue(user({ lastName: 'Byron' }) as never)
    repo.findLatestOutboxBySubject.mockResolvedValue(delivered as never)
    repo.createOutboxEvent.mockResolvedValue({ id: 'bce_new' } as never)

    await enqueueCustomerEnsureForOrganization(
      { repository: repo },
      organization() as never,
      NOW + 100
    )
    expect(repo.createOutboxEvent).toHaveBeenCalledTimes(2)
  })
})

describe('enqueueCustomerEnsureForUser', () => {
  it('creates pending event for user', async () => {
    const repo = makeRepository()
    repo.findLatestOutboxBySubject.mockResolvedValue(null)
    repo.createOutboxEvent.mockImplementation(async (data) => data)

    await enqueueCustomerEnsureForUser(
      { repository: repo },
      user() as never,
      NOW
    )

    expect(repo.createOutboxEvent).toHaveBeenCalledOnce()
    const data = repo.createOutboxEvent.mock
      .calls[0]?.[0] as BillingCustomerOutboxRow
    expect(data.subjectType).toBe('user')
    expect(data.customerKind).toBe('INDIVIDUAL')
    expect(data.name).toBe('Ada Lovelace')
  })

  it('deduplicates pending user event', async () => {
    const repo = makeRepository()
    const pending: BillingCustomerOutboxRow = {
      id: 'bce_user',
      eventType: CUSTOMER_EVENT_TYPE,
      subjectType: 'user',
      subjectId: 'user_1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      customerKind: 'INDIVIDUAL',
      companyName: null,
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: null,
      contactUserId: null,
      contactFirstName: null,
      contactLastName: null,
      contactEmail: null,
      contactPhone: null,
      payloadHash: null,
      occurredAt: BigInt(NOW),
      status: 'pending',
      attemptCount: 0,
      availableAt: BigInt(NOW),
      lockedAt: null,
      deliveredAt: null,
      lastError: null,
      createdAt: BigInt(NOW),
      updatedAt: BigInt(NOW),
    }

    repo.findLatestOutboxBySubject.mockResolvedValueOnce(null)
    repo.createOutboxEvent.mockImplementation(async (data) => {
      pending.payloadHash = data.payloadHash
      return data
    })
    await enqueueCustomerEnsureForUser(
      { repository: repo },
      user() as never,
      NOW
    )
    expect(repo.createOutboxEvent).toHaveBeenCalledTimes(1)

    repo.findLatestOutboxBySubject.mockResolvedValue(pending as never)
    await enqueueCustomerEnsureForUser(
      { repository: repo },
      user() as never,
      NOW
    )
    expect(repo.createOutboxEvent).toHaveBeenCalledTimes(1)
  })
})

describe('enqueueReconcileAll', () => {
  it('covers orgs and only already known users', async () => {
    const repo = makeRepository()
    repo.listOrganizations.mockResolvedValue([organization() as never])
    repo.listKnownUserIds.mockResolvedValue(['user_1'])
    repo.listMembershipsByOrganizationId.mockResolvedValue([
      membership() as never,
    ])
    repo.findUserById.mockResolvedValue(user() as never)
    repo.findLatestOutboxBySubject.mockResolvedValue(null)
    repo.createOutboxEvent.mockImplementation(async (data) => data)

    const counts = await enqueueReconcileAll({ repository: repo }, NOW)

    expect(counts).toEqual({ organizations: 1, users: 1 })
    expect(repo.createOutboxEvent).toHaveBeenCalledTimes(2)
  })

  it('does not manufacture customers for new signups', async () => {
    const repo = makeRepository()
    repo.listOrganizations.mockResolvedValue([organization() as never])
    repo.listKnownUserIds.mockResolvedValue([])
    repo.listMembershipsByOrganizationId.mockResolvedValue([
      membership() as never,
    ])
    repo.findUserById.mockResolvedValue(user() as never)
    repo.findLatestOutboxBySubject.mockResolvedValue(null)
    repo.createOutboxEvent.mockImplementation(async (data) => data)

    const counts = await enqueueReconcileAll({ repository: repo }, NOW)

    expect(counts).toEqual({ organizations: 1, users: 0 })
    expect(repo.createOutboxEvent).toHaveBeenCalledTimes(1)
  })

  it('skips users whose row is gone', async () => {
    const repo = makeRepository()
    repo.listOrganizations.mockResolvedValue([])
    repo.listKnownUserIds.mockResolvedValue(['user_missing'])
    repo.findUserById.mockResolvedValue(null)
    repo.findLatestOutboxBySubject.mockResolvedValue(null)

    const counts = await enqueueReconcileAll({ repository: repo }, NOW)

    expect(counts).toEqual({ organizations: 0, users: 0 })
    expect(repo.createOutboxEvent).not.toHaveBeenCalled()
  })

  it('counts only changed organizations', async () => {
    const repo = makeRepository()
    // Two orgs: first has pending duplicate, second is new
    const org2 = organization({ id: 'org_2', name: 'Second' })
    repo.listOrganizations.mockResolvedValue([
      organization() as never,
      org2 as never,
    ])
    repo.listKnownUserIds.mockResolvedValue([])
    repo.listMembershipsByOrganizationId.mockResolvedValue([])
    // First org already has delivered identical event
    let org1Hash: string | null = null
    repo.findLatestOutboxBySubject.mockImplementation(async (type, id) => {
      if (id === 'org_1' && org1Hash) {
        return {
          id: 'bce_1',
          subjectType: 'organization',
          subjectId: 'org_1',
          status: 'delivered',
          payloadHash: org1Hash,
        } as never
      }
      return null
    })
    repo.createOutboxEvent.mockImplementation(async (data) => {
      if (data.subjectId === 'org_1') org1Hash = data.payloadHash
      return data
    })

    // Seed first call to capture hash
    repo.listMembershipsByOrganizationId.mockResolvedValueOnce([])
    repo.listMembershipsByOrganizationId.mockResolvedValueOnce([])
    // Need to prime org1Hash by doing one creation manually
    // Instead simplify: mock findLatest to return delivered with matching hash
    // We'll set up so org1 is deduplicated, org2 is created
    const { _payloadHash } = await import('../billing-customer-sync')
    const snap1 = await snapshotForOrganization(
      { repository: repo },
      organization() as never
    )
    const hash1 = _payloadHash(snap1)
    repo.findLatestOutboxBySubject.mockImplementation(async (_t, id) => {
      if (id === 'org_1')
        return { status: 'delivered', payloadHash: hash1 } as never
      return null
    })

    const counts = await enqueueReconcileAll({ repository: repo }, NOW)
    // org_1 deduped, org_2 created
    expect(counts.organizations).toBe(1)
  })
})
