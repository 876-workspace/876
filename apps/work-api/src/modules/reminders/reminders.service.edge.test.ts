vi.hoisted(() => {
  process.env.WORK_DATABASE_URL = 'postgres://localhost/test'
})
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as remindersService from './reminders.service.js'
import * as repository from './reminders.repository.js'
import * as tenants from '../tenants/index.js'
import type { WorkReminderStatus } from '@876/work'

vi.mock('./reminders.repository.js')
vi.mock('../tenants/index.js')

type ReminderRow = Awaited<ReturnType<typeof repository.retrieve>>
type Tenant = Awaited<ReturnType<typeof tenants.retrieveByOrganization>>

describe('Reminders Service - Edge Cases', () => {
  const FAKE_TIME = new Date('2026-01-01T12:00:00.000Z')
  const ORG_ID = 'org_123'
  const TENANT_ID = 'tenant_123'
  const REMINDER_ID = 'rem_123'

  function createMockTenant(
    overrides: Partial<NonNullable<Tenant>> = {}
  ): NonNullable<Tenant> {
    return {
      object: 'work_tenant' as const,
      id: TENANT_ID,
      organizationId: ORG_ID,
      status: 'ACTIVE' as const,
      createdAt: 1000,
      updatedAt: 1000,
      ...overrides,
    }
  }

  function createMockReminderRow(
    overrides: Partial<NonNullable<ReminderRow>> = {}
  ): NonNullable<ReminderRow> {
    return {
      id: REMINDER_ID,
      tenantId: TENANT_ID,
      contextService: null,
      contextResource: null,
      contextId: null,
      title: 'Test reminder',
      note: null,
      remindAt: new Date('2026-01-02T00:00:00.000Z'),
      timeZone: 'UTC',
      recurrenceRuleId: null,
      userId: 'user_1',
      status: 'SCHEDULED' as WorkReminderStatus,
      sentAt: null,
      dismissedAt: null,
      createdBy: 'user_1',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(
      createMockTenant()
    )
    vi.mocked(repository.retrieve).mockResolvedValue(createMockReminderRow())
    vi.mocked(repository.update).mockResolvedValue(createMockReminderRow())
    vi.mocked(repository.create).mockResolvedValue(createMockReminderRow())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Completion stamping state machine', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(FAKE_TIME)
    })

    // Valid moves
    it('SCHEDULED -> SENT: sentAt stamped', async () => {
      vi.mocked(repository.retrieve).mockResolvedValue(
        createMockReminderRow({ status: 'SCHEDULED' })
      )
      await remindersService.update(ORG_ID, REMINDER_ID, { status: 'SENT' })
      expect(repository.update).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(REMINDER_ID, {
        status: 'SENT',
        sentAt: FAKE_TIME,
      })
    })

    it('SENT -> DISMISSED: dismissedAt stamped', async () => {
      vi.mocked(repository.retrieve).mockResolvedValue(
        createMockReminderRow({
          status: 'SENT',
          sentAt: new Date('2025-01-01T00:00:00.000Z'),
        })
      )
      await remindersService.update(ORG_ID, REMINDER_ID, {
        status: 'DISMISSED',
      })
      expect(repository.update).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(REMINDER_ID, {
        status: 'DISMISSED',
        dismissedAt: FAKE_TIME,
      })
    })

    it('SCHEDULED -> CANCELLED: just cancelled, no stamps', async () => {
      vi.mocked(repository.retrieve).mockResolvedValue(
        createMockReminderRow({ status: 'SCHEDULED' })
      )
      await remindersService.update(ORG_ID, REMINDER_ID, {
        status: 'CANCELLED',
      })
      expect(repository.update).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(REMINDER_ID, {
        status: 'CANCELLED',
      })
    })

    // Reminders have no forward-only lifecycle: rescheduling a sent reminder is
    // "snooze", and reinstating a cancelled one is a legitimate correction. What
    // must hold is that leaving a state clears the stamp it set, so a reminder
    // never claims to have been sent at a time it was subsequently rescheduled past.
    it('SENT -> SCHEDULED: reschedules and clears sentAt', async () => {
      vi.mocked(repository.retrieve).mockResolvedValue(
        createMockReminderRow({
          status: 'SENT',
          sentAt: new Date('2025-01-01T00:00:00.000Z'),
        })
      )

      await remindersService.update(ORG_ID, REMINDER_ID, {
        status: 'SCHEDULED',
      })

      expect(repository.update).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(REMINDER_ID, {
        status: 'SCHEDULED',
        sentAt: null,
      })
    })

    it('DISMISSED -> SENT: stamps sentAt and clears dismissedAt', async () => {
      vi.mocked(repository.retrieve).mockResolvedValue(
        createMockReminderRow({
          status: 'DISMISSED',
          sentAt: new Date('2025-01-01T00:00:00.000Z'),
          dismissedAt: new Date('2025-01-02T00:00:00.000Z'),
        })
      )

      await remindersService.update(ORG_ID, REMINDER_ID, { status: 'SENT' })

      expect(repository.update).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(REMINDER_ID, {
        status: 'SENT',
        sentAt: FAKE_TIME,
        dismissedAt: null,
      })
    })

    it('CANCELLED -> SCHEDULED: reinstates without stamping either timestamp', async () => {
      vi.mocked(repository.retrieve).mockResolvedValue(
        createMockReminderRow({ status: 'CANCELLED' })
      )

      await remindersService.update(ORG_ID, REMINDER_ID, {
        status: 'SCHEDULED',
      })

      expect(repository.update).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(REMINDER_ID, {
        status: 'SCHEDULED',
      })
    })

    it('SENT -> SENT: does not re-stamp sentAt', async () => {
      const alreadySent = new Date('2025-01-01T00:00:00.000Z')
      vi.mocked(repository.retrieve).mockResolvedValue(
        createMockReminderRow({ status: 'SENT', sentAt: alreadySent })
      )

      await remindersService.update(ORG_ID, REMINDER_ID, { status: 'SENT' })

      expect(repository.update).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(REMINDER_ID, {
        status: 'SENT',
      })
    })

    it('a title-only update leaves both lifecycle stamps untouched', async () => {
      vi.mocked(repository.retrieve).mockResolvedValue(
        createMockReminderRow({
          status: 'SENT',
          sentAt: new Date('2025-01-01T00:00:00.000Z'),
        })
      )

      await remindersService.update(ORG_ID, REMINDER_ID, {
        title: 'Call Alejandra about the delayed parcel',
      })

      expect(repository.update).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(REMINDER_ID, {
        title: 'Call Alejandra about the delayed parcel',
      })
    })
  })

  describe('Tenant Guards', () => {
    it('returns tenant-not-found when tenant does not exist and never calls repository', async () => {
      vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
      const result = await remindersService.update(ORG_ID, REMINDER_ID, {
        status: 'SENT',
      })
      expect(result).toEqual({
        code: 'work/tenant-not-found',
        message: expect.any(String),
        httpStatus: 404,
      })
      expect(repository.retrieve).not.toHaveBeenCalled()
      expect(repository.update).not.toHaveBeenCalled()
    })

    it('returns tenant-inactive when tenant is SUSPENDED and never calls repository', async () => {
      vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(
        createMockTenant({ status: 'SUSPENDED' })
      )
      const result = await remindersService.update(ORG_ID, REMINDER_ID, {
        status: 'SENT',
      })
      expect(result).toEqual({
        code: 'work/tenant-inactive',
        message: expect.any(String),
        httpStatus: 409,
      })
      expect(repository.retrieve).not.toHaveBeenCalled()
      expect(repository.update).not.toHaveBeenCalled()
    })
  })

  describe('Soft-delete edge case', () => {
    it('returns null on update to a soft-deleted reminder (not found)', async () => {
      vi.mocked(repository.retrieve).mockResolvedValue(null)
      const result = await remindersService.update(ORG_ID, REMINDER_ID, {
        status: 'SENT',
      })
      expect(result).toBeNull()
      expect(repository.update).not.toHaveBeenCalled()
    })
  })

  describe('remindAt in the past', () => {
    it('is accepted during creation', async () => {
      const pastUnixSeconds = 1000 // 1970
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

      await remindersService.create(ORG_ID, {
        title: 'Past reminder',
        userId: 'user_1',
        remindAt: pastUnixSeconds,
        createdBy: 'user_1',
      })

      expect(repository.create).toHaveBeenCalledTimes(1)
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ remindAt: new Date(pastUnixSeconds * 1000) })
      )
    })
  })
})
