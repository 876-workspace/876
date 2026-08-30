import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createWorkCalendarInputSchema,
  updateWorkCalendarInputSchema,
} from '@876/work'

vi.mock('../tenants/index.js', () => ({
  retrieveByOrganization: vi.fn(),
}))
vi.mock('./calendars.repository.js', () => ({
  list: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  primaryForUser: vi.fn(),
}))

import * as tenants from '../tenants/index.js'
import * as repository from './calendars.repository.js'
import * as service from './calendars.service.js'

const tenant = { id: 'work_tnt_1', organizationId: 'org_kingston_1', status: 'ACTIVE' as const }

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cal_mandeville_1',
    tenantId: tenant.id,
    uid: 'cal_mandeville_1@work.876',
    ownerUserId: 'user_kingston_1',
    name: 'Work Calendar',
    description: null,
    timeZone: 'America/Jamaica',
    visibility: 'PRIVATE' as const,
    isPrimary: false,
    createdBy: 'user_kingston_1',
    createdAt: new Date('2026-08-30T12:00:00.000Z'),
    updatedAt: new Date('2026-08-30T12:00:00.000Z'),
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(tenant as never)
})

describe('Work calendars service', () => {
  it('create stores calendar and serializes with object discriminator', async () => {
    vi.mocked(repository.create).mockResolvedValue(row() as never)
    const result = await service.create('org_kingston_1', { name: 'Work Calendar', timeZone: 'America/Jamaica', createdBy: 'user_kingston_1' })
    expect(result).toEqual(expect.objectContaining({ object: 'calendar', name: 'Work Calendar' }))
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: tenant.id, timeZone: 'America/Jamaica' }))
  })

  it('create with PRIVATE visibility persists it', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ visibility: 'PRIVATE' }) as never)
    await service.create('org_kingston_1', { name: 'Private Cal', timeZone: 'UTC', visibility: 'PRIVATE', createdBy: 'user_1' })
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'PRIVATE' }))
  })

  it('create with ORGANIZATION visibility persists it', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ visibility: 'ORGANIZATION' }) as never)
    await service.create('org_kingston_1', { name: 'Org Cal', timeZone: 'UTC', visibility: 'ORGANIZATION', createdBy: 'user_1' })
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'ORGANIZATION' }))
  })

  it('create returns tenant-not-found and never calls repository when tenant missing', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
    const result = await service.create('org_missing', { name: 'X', timeZone: 'UTC', createdBy: 'user_1' })
    expect(result).toEqual(expect.objectContaining({ code: 'work/tenant-not-found' }))
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('retrieve returns calendar when found', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'cal_found' }) as never)
    const result = await service.retrieve('org_kingston_1', 'cal_found')
    expect(result).toEqual(expect.objectContaining({ id: 'cal_found' }))
    expect(repository.retrieve).toHaveBeenCalledWith(tenant.id, 'cal_found')
  })

  it('retrieve returns null when not found', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.retrieve('org_kingston_1', 'missing')
    expect(result).toBeNull()
  })

  it('list returns calendars for tenant', async () => {
    vi.mocked(repository.list).mockResolvedValue([row({ id: 'cal_a' }), row({ id: 'cal_b' })] as never)
    const result = await service.list('org_kingston_1', {}) as { data: unknown[]; hasMore: boolean }
    expect(result.data).toHaveLength(2)
    expect(result.hasMore).toBe(false)
  })

  it('list signals hasMore when over limit', async () => {
    const many = Array.from({ length: 3 }, (_, i) => row({ id: `cal_${i}` }))
    vi.mocked(repository.list).mockResolvedValue(many as never)
    const result = await service.list('org_kingston_1', { limit: 2 }) as { data: unknown[]; hasMore: boolean }
    expect(result.data).toHaveLength(2)
    expect(result.hasMore).toBe(true)
  })

  it('update renames calendar', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'cal_1' }) as never)
    vi.mocked(repository.update).mockResolvedValue(row({ id: 'cal_1', name: 'Updated' }) as never)
    const result = await service.update('org_kingston_1', 'cal_1', { name: 'Updated' })
    expect(result).toEqual(expect.objectContaining({ name: 'Updated' }))
    expect(repository.update).toHaveBeenCalledWith('cal_1', expect.objectContaining({ name: 'Updated' }))
  })

  it('update returns null when calendar not found and never updates', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.update('org_kingston_1', 'missing', { name: 'X' })
    expect(result).toBeNull()
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('remove deletes non-primary calendar', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'cal_1', isPrimary: false }) as never)
    vi.mocked(repository.remove).mockResolvedValue({ object: 'calendar', id: 'cal_1', deleted: true } as never)
    const result = await service.remove('org_kingston_1', 'cal_1', 'user_1')
    expect(result).toEqual(expect.objectContaining({ deleted: true }))
    expect(repository.remove).toHaveBeenCalledWith('cal_1', 'user_1')
  })

  it('remove rejects deleting primary calendar with calendar-primary-delete-forbidden and never removes', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'cal_primary', isPrimary: true }) as never)
    const result = await service.remove('org_kingston_1', 'cal_primary', 'user_1')
    expect(result).toEqual({ code: 'work/calendar-primary-delete-forbidden', message: expect.any(String), httpStatus: 409 })
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('remove returns null when calendar not found', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.remove('org_kingston_1', 'missing', 'user_1')
    expect(result).toBeNull()
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('returns tenant-inactive for create when tenant suspended', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue({ ...tenant, status: 'SUSPENDED' } as never)
    const result = await service.create('org_kingston_1', { name: 'X', timeZone: 'UTC', createdBy: 'user_1' })
    expect(result).toEqual(expect.objectContaining({ code: 'work/tenant-inactive' }))
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('second calendar for same owner is not primary - repository decides', async () => {
    // repository.create internally determines isPrimary; service just forwards
    vi.mocked(repository.create).mockResolvedValue(row({ ownerUserId: 'user_kingston_1', isPrimary: false }) as never)
    const result = await service.create('org_kingston_1', { name: 'Second', timeZone: 'UTC', createdBy: 'user_kingston_1', ownerUserId: 'user_kingston_1' })
    expect(result).toEqual(expect.objectContaining({ isPrimary: false }))
  })

  it('ensurePrimary returns the existing primary calendar without creating a second one', async () => {
    vi.mocked(repository.primaryForUser).mockResolvedValue(row({ id: 'cal_primary_existing', isPrimary: true }) as never)
    const result = await service.ensurePrimary('org_kingston_1', 'user_kingston_1', 'America/Jamaica')
    expect(result).toEqual(expect.objectContaining({ id: 'cal_primary_existing', isPrimary: true }))
    expect(repository.primaryForUser).toHaveBeenCalledWith(tenant.id, 'user_kingston_1')
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('ensurePrimary creates a primary calendar for the user when none exists', async () => {
    vi.mocked(repository.primaryForUser).mockResolvedValue(null)
    vi.mocked(repository.create).mockResolvedValue(row({ isPrimary: true }) as never)
    const result = await service.ensurePrimary('org_kingston_1', 'user_kingston_1', 'America/Jamaica')
    expect(result).toEqual(expect.objectContaining({ isPrimary: true }))
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        ownerUserId: 'user_kingston_1',
        name: 'Calendar',
        timeZone: 'America/Jamaica',
        visibility: 'PRIVATE',
        createdBy: 'user_kingston_1',
      })
    )
  })

  it('ensurePrimary defaults the time zone to UTC when omitted', async () => {
    vi.mocked(repository.primaryForUser).mockResolvedValue(null)
    vi.mocked(repository.create).mockResolvedValue(row() as never)
    await service.ensurePrimary('org_kingston_1', 'user_kingston_1')
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ timeZone: 'UTC' }))
  })

  it('ensurePrimary returns tenant-not-found and never creates when tenant missing', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
    const result = await service.ensurePrimary('org_missing', 'user_kingston_1')
    expect(result).toEqual({ code: 'work/tenant-not-found', message: expect.any(String), httpStatus: 404 })
    expect(repository.primaryForUser).not.toHaveBeenCalled()
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('serializes the calendar with uid and Unix-second timestamps', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'cal_mandeville_1' }) as never)
    const result = await service.retrieve('org_kingston_1', 'cal_mandeville_1')
    expect(result).toEqual({
      object: 'calendar',
      id: 'cal_mandeville_1',
      uid: 'cal_mandeville_1@work.876',
      organizationId: 'org_kingston_1',
      ownerUserId: 'user_kingston_1',
      name: 'Work Calendar',
      description: null,
      timeZone: 'America/Jamaica',
      visibility: 'PRIVATE',
      isPrimary: false,
      createdBy: 'user_kingston_1',
      createdAt: 1_788_091_200,
      updatedAt: 1_788_091_200,
    })
  })

  it('create accepts an ORGANIZATION-visibility payload via the real schema', () => {
    const parsed = createWorkCalendarInputSchema.parse({
      name: 'Org Calendar',
      description: 'Team-wide calendar',
      timeZone: 'America/Jamaica',
      visibility: 'ORGANIZATION',
      createdBy: 'user_kingston_1',
    })
    expect(parsed.visibility).toBe('ORGANIZATION')
  })

  it('rejects a calendar payload with an unknown visibility via the real schema', () => {
    expect(() =>
      createWorkCalendarInputSchema.parse({
        name: 'Bad Cal',
        timeZone: 'UTC',
        visibility: 'PUBLIC',
        createdBy: 'user_1',
      })
    ).toThrow()
  })

  it('rejects a calendar payload with an empty time zone via the real schema', () => {
    expect(() =>
      createWorkCalendarInputSchema.parse({
        name: 'Bad Cal',
        timeZone: '   ',
        createdBy: 'user_1',
      })
    ).toThrow()
  })

  it('rejects an empty calendar update payload via the real schema', () => {
    expect(() => updateWorkCalendarInputSchema.parse({})).toThrow()
  })

  it('list forwards the userId and visibility filters to the repository', async () => {
    vi.mocked(repository.list).mockResolvedValue([] as never)
    await service.list('org_kingston_1', { userId: 'user_kingston_1', visibility: 'ORGANIZATION' })
    expect(repository.list).toHaveBeenCalledWith(tenant.id, {
      userId: 'user_kingston_1',
      visibility: 'ORGANIZATION',
      limit: 25,
    })
  })

  it('list reverses the page when endingBefore is used', async () => {
    vi.mocked(repository.list).mockResolvedValue([
      row({ id: 'cal_a' }),
      row({ id: 'cal_b' }),
    ] as never)
    const result = await service.list('org_kingston_1', { limit: 25, endingBefore: 'cal_b' }) as { data: Array<{ id: string }> }
    expect(result.data.map((r) => r.id)).toEqual(['cal_b', 'cal_a'])
  })

  it('update changes visibility and time zone together', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'cal_1' }) as never)
    vi.mocked(repository.update).mockResolvedValue(row({ id: 'cal_1', visibility: 'ORGANIZATION', timeZone: 'UTC' }) as never)
    const result = await service.update('org_kingston_1', 'cal_1', { visibility: 'ORGANIZATION', timeZone: 'UTC' })
    expect(result).toEqual(expect.objectContaining({ visibility: 'ORGANIZATION', timeZone: 'UTC' }))
    expect(repository.update).toHaveBeenCalledWith('cal_1', expect.objectContaining({ visibility: 'ORGANIZATION', timeZone: 'UTC' }))
  })

  it('update returns tenant-not-found without querying the repository when tenant missing', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
    const result = await service.update('org_missing', 'cal_1', { name: 'X' })
    expect(result).toEqual({ code: 'work/tenant-not-found', message: expect.any(String), httpStatus: 404 })
    expect(repository.retrieve).not.toHaveBeenCalled()
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('remove returns tenant-inactive and never removes when tenant suspended', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue({ ...tenant, status: 'SUSPENDED' } as never)
    const result = await service.remove('org_kingston_1', 'cal_1', 'user_1')
    expect(result).toEqual({ code: 'work/tenant-inactive', message: expect.any(String), httpStatus: 409 })
    expect(repository.retrieve).not.toHaveBeenCalled()
    expect(repository.remove).not.toHaveBeenCalled()
  })
})
