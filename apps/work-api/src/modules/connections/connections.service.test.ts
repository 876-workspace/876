import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  activeConnection: vi.fn(),
  ensure: vi.fn(),
}))

vi.mock('./connections.repository.js', () => repository)

const { ensureCrmConnection } = await import('./connections.service.js')

const CRM_WORK_SCOPES = [
  'work.tasks.read',
  'work.tasks.write',
  'work.reminders.read',
  'work.reminders.write',
  'work.calendars.read',
  'work.calendars.write',
  'work.events.read',
  'work.events.write',
  'work.alerts.read',
  'work.alerts.write',
  'work.my-work.read',
  'work.resource-work.read',
]

describe('ensureCrmConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    repository.ensure.mockResolvedValue({
      id: 'work_conn_1',
      tenantId: 'work_tnt_1',
      appId: 'app_crm',
      scopes: CRM_WORK_SCOPES,
    })
  })

  it('ensures CRM’s current Work scopes for a new workspace connection', async () => {
    await ensureCrmConnection('work_tnt_1', 'app_crm')

    expect(repository.ensure).toHaveBeenCalledTimes(1)
    expect(repository.ensure).toHaveBeenCalledWith(
      'work_tnt_1',
      'app_crm',
      CRM_WORK_SCOPES
    )
  })

  it('restores CRM’s current Work scopes when ensuring an existing connection', async () => {
    repository.ensure.mockResolvedValue({
      id: 'work_conn_1',
      tenantId: 'work_tnt_1',
      appId: 'app_crm',
      scopes: ['work.tasks.read'],
    })

    await ensureCrmConnection('work_tnt_1', 'app_crm')

    expect(repository.ensure).toHaveBeenCalledTimes(1)
    expect(repository.ensure).toHaveBeenCalledWith(
      'work_tnt_1',
      'app_crm',
      CRM_WORK_SCOPES
    )
  })
})