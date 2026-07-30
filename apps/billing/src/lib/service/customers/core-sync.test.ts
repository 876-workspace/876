import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Platform876Client } from '@876/core/platform'

import {
  backfillOrgOwnerContacts,
  resolveOrgOwner,
  resolveOrgParty,
  syncOrgOwnerContact,
} from './core-sync'

const mocks = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
  generateId: vi.fn(),
  nowUnixSeconds: vi.fn(),
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

function platform(options?: {
  memberships?: unknown
  user?: unknown
  profile?: unknown
  org?: unknown
}): Platform876Client {
  return {
    memberships: {
      list: vi.fn().mockResolvedValue(
        options?.memberships ?? {
          data: {
            object: 'list',
            data: [
              {
                id: 'mem_1',
                organization_id: 'org_1',
                user_id: 'usr_owner',
                role: 'owner',
                created_at: 10,
              },
            ],
          },
          error: null,
        }
      ),
    },
    users: {
      retrieve: vi.fn().mockResolvedValue(
        options?.user ?? {
          data: {
            id: 'usr_owner',
            first_name: 'Ada',
            last_name: 'Lovelace',
            email: 'ada@efesto.test',
          },
          error: null,
        }
      ),
    },
    organizations: {
      retrieveProfile: vi.fn().mockResolvedValue(
        options?.profile ?? {
          data: {
            name: 'Efesto Technologies',
            doing_business_as: 'Efesto',
            primary_email: 'ap@efesto.test',
            primary_phone: '+18765550000',
          },
          error: null,
        }
      ),
      retrieve: vi.fn().mockResolvedValue(
        options?.org ?? {
          data: { id: 'org_1', name: 'Efesto Technologies' },
          error: null,
        }
      ),
    },
  } as unknown as Platform876Client
}

describe('resolveOrgOwner', () => {
  it('returns the owner membership with live user fields', async () => {
    const client = platform()

    const owner = await resolveOrgOwner(client, 'org_1')

    expect(owner).toEqual({
      userId: 'usr_owner',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@efesto.test',
    })
    expect(client.memberships.list).toHaveBeenCalledWith({
      organizationId: 'org_1',
      limit: 100,
    })
    expect(client.users.retrieve).toHaveBeenCalledWith('usr_owner')
  })

  it('prefers owner over an earlier admin membership', async () => {
    const client = platform({
      memberships: {
        data: {
          object: 'list',
          data: [
            {
              id: 'mem_admin',
              user_id: 'usr_admin',
              role: 'admin',
              created_at: 1,
            },
            {
              id: 'mem_owner',
              user_id: 'usr_owner',
              role: 'owner',
              created_at: 99,
            },
          ],
        },
        error: null,
      },
    })

    const owner = await resolveOrgOwner(client, 'org_1')

    expect(owner?.userId).toBe('usr_owner')
  })

  it('falls back to the earliest member when no owner exists', async () => {
    const client = platform({
      memberships: {
        data: {
          object: 'list',
          data: [
            {
              id: 'mem_late',
              user_id: 'usr_late',
              role: 'member',
              created_at: 40,
            },
            {
              id: 'mem_early',
              user_id: 'usr_early',
              role: 'admin',
              created_at: 5,
            },
          ],
        },
        error: null,
      },
      user: {
        data: {
          id: 'usr_early',
          first_name: 'Early',
          last_name: 'Bird',
          email: 'early@efesto.test',
        },
        error: null,
      },
    })

    const owner = await resolveOrgOwner(client, 'org_1')

    expect(owner?.userId).toBe('usr_early')
    expect(client.users.retrieve).toHaveBeenCalledWith('usr_early')
  })

  it('returns userId-only when the user retrieve fails', async () => {
    const client = platform({
      user: { data: null, error: { message: 'gone' } },
    })

    const owner = await resolveOrgOwner(client, 'org_1')

    expect(owner).toEqual({
      userId: 'usr_owner',
      firstName: null,
      lastName: null,
      email: null,
    })
  })

  it('returns null when memberships cannot be listed', async () => {
    const client = platform({
      memberships: { data: null, error: { message: 'unavailable' } },
    })

    await expect(resolveOrgOwner(client, 'org_1')).resolves.toBeNull()
  })

  it('returns null when the org has no members', async () => {
    const client = platform({
      memberships: {
        data: { object: 'list', data: [] },
        error: null,
      },
    })

    await expect(resolveOrgOwner(client, 'org_1')).resolves.toBeNull()
    expect(client.users.retrieve).not.toHaveBeenCalled()
  })
})

describe('resolveOrgParty', () => {
  it('prefers the profile endpoint for trading name and AP details', async () => {
    const client = platform()

    const party = await resolveOrgParty(client, 'org_1')

    expect(party).toEqual({
      companyName: 'Efesto Technologies',
      displayName: 'Efesto',
      email: 'ap@efesto.test',
      phone: '+18765550000',
    })
    expect(client.organizations.retrieve).not.toHaveBeenCalled()
  })

  it('falls back to the basic org record when the profile is unavailable', async () => {
    const client = platform({
      profile: { data: null, error: { message: 'no profile' } },
    })

    const party = await resolveOrgParty(client, 'org_1')

    expect(party).toEqual({
      companyName: 'Efesto Technologies',
      displayName: 'Efesto Technologies',
      email: null,
      phone: null,
    })
    expect(client.organizations.retrieve).toHaveBeenCalledWith('org_1')
  })

  it('returns null when neither profile nor org can be resolved', async () => {
    const client = platform({
      profile: { data: null, error: null },
      org: { data: null, error: null },
    })

    await expect(resolveOrgParty(client, 'org_1')).resolves.toBeNull()
  })

  it('uses the legal name as displayName when trading name is absent', async () => {
    const client = platform({
      profile: {
        data: {
          name: 'Efesto Technologies',
          doing_business_as: null,
          primary_email: null,
          primary_phone: null,
        },
        error: null,
      },
    })

    const party = await resolveOrgParty(client, 'org_1')

    expect(party?.displayName).toBe('Efesto Technologies')
    expect(party?.companyName).toBe('Efesto Technologies')
  })
})

describe('syncOrgOwnerContact', () => {
  beforeEach(() => {
    mocks.prismaRef.current = {
      customer: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      contact: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({ id: 'con_existing' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({ id: 'con_new' }),
      },
    }
    mocks.generateId.mockReturnValue('con_new')
    mocks.nowUnixSeconds.mockReturnValue(1_700)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function prisma() {
    return mocks.prismaRef.current as {
      customer: { updateMany: ReturnType<typeof vi.fn> }
      contact: {
        findFirst: ReturnType<typeof vi.fn>
        update: ReturnType<typeof vi.fn>
        updateMany: ReturnType<typeof vi.fn>
        create: ReturnType<typeof vi.fn>
      }
    }
  }

  it('creates a primary owner contact and refreshes the party snapshot', async () => {
    const client = platform()
    const db = prisma()

    const result = await syncOrgOwnerContact(client, 'ten_1', 'cus_1', 'org_1')

    expect(result).toEqual({ status: 'created', contactId: 'con_new' })
    expect(db.customer.updateMany).toHaveBeenCalledWith({
      where: { id: 'cus_1', tenantId: 'ten_1' },
      data: {
        customerKind: 'BUSINESS',
        name: 'Efesto',
        companyName: 'Efesto Technologies',
        email: 'ap@efesto.test',
        phone: '+18765550000',
        firstName: 'Ada',
        lastName: 'Lovelace',
        coreSyncedAt: 1_700,
        updatedAt: 1_700,
      },
    })
    expect(db.contact.updateMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', customerId: 'cus_1', isPrimary: true },
      data: { isPrimary: false, updatedAt: 1_700 },
    })
    expect(db.contact.create).toHaveBeenCalledWith({
      data: {
        id: 'con_new',
        tenantId: 'ten_1',
        customerId: 'cus_1',
        userId: 'usr_owner',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@efesto.test',
        isPrimary: true,
        coreSyncedAt: 1_700,
        createdAt: 1_700,
        updatedAt: 1_700,
      },
    })
    // Second touch stamps coreSyncedAt after the contact lands.
    expect(db.customer.updateMany).toHaveBeenCalledTimes(2)
  })

  it('refreshes an existing owner contact without demoting others', async () => {
    const client = platform()
    const db = prisma()
    db.contact.findFirst.mockResolvedValue({ id: 'con_existing' })

    const result = await syncOrgOwnerContact(client, 'ten_1', 'cus_1', 'org_1')

    expect(result).toEqual({ status: 'refreshed', contactId: 'con_existing' })
    expect(db.contact.update).toHaveBeenCalledWith({
      where: { id: 'con_existing' },
      data: {
        salutation: undefined,
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@efesto.test',
        isPrimary: true,
        coreSyncedAt: 1_700,
        updatedAt: 1_700,
      },
    })
    expect(db.contact.create).not.toHaveBeenCalled()
    expect(db.contact.updateMany).not.toHaveBeenCalled()
  })

  it('still writes the party snapshot when the owner cannot be resolved', async () => {
    const client = platform({
      memberships: {
        data: { object: 'list', data: [] },
        error: null,
      },
    })
    const db = prisma()

    const result = await syncOrgOwnerContact(client, 'ten_1', 'cus_1', 'org_1')

    expect(result).toEqual({ status: 'skipped', reason: 'unresolved' })
    expect(db.customer.updateMany).toHaveBeenCalledWith({
      where: { id: 'cus_1', tenantId: 'ten_1' },
      data: {
        customerKind: 'BUSINESS',
        name: 'Efesto',
        companyName: 'Efesto Technologies',
        email: 'ap@efesto.test',
        phone: '+18765550000',
        coreSyncedAt: 1_700,
        updatedAt: 1_700,
      },
    })
    expect(db.contact.create).not.toHaveBeenCalled()
  })

  it('skips without writing when neither party nor owner can be resolved', async () => {
    const client = platform({
      memberships: { data: null, error: { message: 'down' } },
      profile: { data: null, error: null },
      org: { data: null, error: null },
    })
    const db = prisma()

    const result = await syncOrgOwnerContact(client, 'ten_1', 'cus_1', 'org_1')

    expect(result).toEqual({ status: 'skipped', reason: 'unresolved' })
    expect(db.customer.updateMany).not.toHaveBeenCalled()
    expect(db.contact.create).not.toHaveBeenCalled()
  })

  it('does not overwrite name/email/phone when Core returns blanks', async () => {
    const client = platform({
      profile: {
        data: {
          name: 'Legal Only',
          doing_business_as: null,
          primary_email: null,
          primary_phone: null,
        },
        error: null,
      },
    })
    const db = prisma()

    await syncOrgOwnerContact(client, 'ten_1', 'cus_1', 'org_1')

    expect(db.customer.updateMany).toHaveBeenCalledWith({
      where: { id: 'cus_1', tenantId: 'ten_1' },
      data: {
        customerKind: 'BUSINESS',
        name: 'Legal Only',
        companyName: 'Legal Only',
        firstName: 'Ada',
        lastName: 'Lovelace',
        coreSyncedAt: 1_700,
        updatedAt: 1_700,
      },
    })
    // email/phone keys must be absent so a local AP address is preserved.
    const data = db.customer.updateMany.mock.calls[0]?.[0]?.data as Record<
      string,
      unknown
    >
    expect(data).not.toHaveProperty('email')
    expect(data).not.toHaveProperty('phone')
  })
})

describe('backfillOrgOwnerContacts', () => {
  beforeEach(() => {
    mocks.prismaRef.current = {
      customer: {
        findMany: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      contact: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({ id: 'con_new' }),
      },
    }
    mocks.generateId.mockReturnValue('con_new')
    mocks.nowUnixSeconds.mockReturnValue(1_800)
    vi.clearAllMocks()
  })

  it('counts created, refreshed, and skipped outcomes across the tenant', async () => {
    const db = mocks.prismaRef.current as {
      customer: { findMany: ReturnType<typeof vi.fn> }
      contact: { findFirst: ReturnType<typeof vi.fn> }
    }
    db.customer.findMany.mockResolvedValue([
      { id: 'cus_1', tenantId: 'ten_1', organizationId: 'org_1' },
      { id: 'cus_2', tenantId: 'ten_1', organizationId: 'org_2' },
      { id: 'cus_3', tenantId: 'ten_1', organizationId: 'org_3' },
    ])
    // First: create (no contact). Second: refresh. Third: unresolved owner.
    db.contact.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'con_2' })
      .mockResolvedValueOnce(null)

    const client = {
      memberships: {
        list: vi
          .fn()
          .mockResolvedValueOnce({
            data: {
              object: 'list',
              data: [
                {
                  user_id: 'usr_1',
                  role: 'owner',
                  created_at: 1,
                },
              ],
            },
            error: null,
          })
          .mockResolvedValueOnce({
            data: {
              object: 'list',
              data: [
                {
                  user_id: 'usr_2',
                  role: 'owner',
                  created_at: 1,
                },
              ],
            },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { object: 'list', data: [] },
            error: null,
          }),
      },
      users: {
        retrieve: vi
          .fn()
          .mockResolvedValueOnce({
            data: {
              id: 'usr_1',
              first_name: 'A',
              last_name: 'One',
              email: 'a@test',
            },
            error: null,
          })
          .mockResolvedValueOnce({
            data: {
              id: 'usr_2',
              first_name: 'B',
              last_name: 'Two',
              email: 'b@test',
            },
            error: null,
          }),
      },
      organizations: {
        retrieveProfile: vi.fn().mockResolvedValue({
          data: {
            name: 'Co',
            doing_business_as: null,
            primary_email: null,
            primary_phone: null,
          },
          error: null,
        }),
        retrieve: vi.fn(),
      },
    } as unknown as Platform876Client

    const result = await backfillOrgOwnerContacts(client, 'ten_1')

    expect(db.customer.findMany).toHaveBeenCalledWith({
      where: {
        customerType: 'CORE_ORGANIZATION',
        organizationId: { not: null },
        tenantId: 'ten_1',
      },
      select: { id: true, tenantId: true, organizationId: true },
    })
    expect(result).toEqual({ created: 1, refreshed: 1, skipped: 1 })
  })

  it('scopes to every tenant when tenantId is omitted', async () => {
    const db = mocks.prismaRef.current as {
      customer: { findMany: ReturnType<typeof vi.fn> }
    }
    db.customer.findMany.mockResolvedValue([])
    const client = platform()

    await backfillOrgOwnerContacts(client)

    expect(db.customer.findMany).toHaveBeenCalledWith({
      where: {
        customerType: 'CORE_ORGANIZATION',
        organizationId: { not: null },
      },
      select: { id: true, tenantId: true, organizationId: true },
    })
  })
})
