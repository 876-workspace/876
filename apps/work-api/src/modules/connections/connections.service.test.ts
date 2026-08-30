import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  activeConnection: vi.fn(),
  ensure: vi.fn(),
}))

vi.mock('./connections.repository.js', () => repository)

const { ensureCrmConnection } = await import('./connections.service.js')

describe('ensureCrmConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    repository.ensure.mockResolvedValue({
      id: 'work_conn_1',
      tenantId: 'work_tnt_1',
      appId: 'app_crm',
      scopes: [
        'work.tasks.read',
        'work.tasks.write',
        'work.reminders.read',
        'work.reminders.write',
      ],
    })
  })

  it('ensures CRM’s four Work scopes for a new workspace connection', async () => {
    await ensureCrmConnection('work_tnt_1', 'app_crm')

    expect(repository.ensure).toHaveBeenCalledTimes(1)
    expect(repository.ensure).toHaveBeenCalledWith('work_tnt_1', 'app_crm', [
      'work.tasks.read',
      'work.tasks.write',
      'work.reminders.read',
      'work.reminders.write',
    ])
  })

  it('leaves a deliberately changed connection grant intact on a rerun', async () => {
    const warning = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined)
    repository.ensure.mockResolvedValue({
      id: 'work_conn_1',
      tenantId: 'work_tnt_1',
      appId: 'app_crm',
      scopes: ['work.tasks.read'],
    })

    await ensureCrmConnection('work_tnt_1', 'app_crm')

    expect(repository.ensure).toHaveBeenCalledTimes(1)
    expect(warning).toHaveBeenCalledWith('work.connection.scopes_mismatch', {
      tenant_id: 'work_tnt_1',
      app_id: 'app_crm',
      expected_scopes: [
        'work.tasks.read',
        'work.tasks.write',
        'work.reminders.read',
        'work.reminders.write',
      ],
      stored_scopes: ['work.tasks.read'],
    })
    warning.mockRestore()
  })
})
