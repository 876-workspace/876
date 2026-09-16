import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenants, projects, repository, automation } = vi.hoisted(() => ({
  tenants: { resolveTenant: vi.fn() },
  projects: { resolveProject: vi.fn() },
  repository: { transaction: vi.fn() },
  automation: { appendOutboxEvent: vi.fn() },
}))

vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../../projects/index.js', () => projects)
vi.mock('../time.repository.js', () => repository)
vi.mock('../../automation/index.js', () => automation)

const service = await import('../time.service.js')

const tenant = { id: 'prjten_1', organizationId: 'org_1' }
let activeTx: Record<string, unknown>

beforeEach(() => {
  tenants.resolveTenant.mockResolvedValue(tenant)
  projects.resolveProject.mockResolvedValue({ id: 'prj_1' })
  activeTx = {
    client: { tag: 'time-transaction-client' },
    createTimeEntry: vi.fn().mockImplementation(
      async (params: Record<string, unknown>) => ({
        ...params,
        id: 'tme_1',
        endedAt: params.endedAt ?? null,
        durationMinutes: 60,
        approvalStatus: 'draft',
        timesheetId: null,
        note: null,
        milestoneId: null,
        taskListId: null,
        issueId: null,
        createdBy: 'user_1',
        createdAt: 1n,
        updatedAt: 1n,
        deletedAt: null,
      })
    ),
  }
  repository.transaction.mockImplementation(
    async (callback: (tx: unknown) => Promise<unknown>) => callback(activeTx)
  )
})

describe('time-entry submit outbox', () => {
  const body = {
    projectId: 'prj_1',
    userId: 'user_1',
    startedAt: 1000,
    endedAt: 4600,
  }

  it('appends time-entry.submitted inside the entry transaction', async () => {
    const result = await service.createTimeEntry('org_1', body)

    expect(result.error).toBeNull()
    expect(automation.appendOutboxEvent).toHaveBeenCalledWith(
      activeTx.client,
      expect.objectContaining({
        tenantId: tenant.id,
        type: 'time-entry.submitted',
        subjectType: 'time-entry',
        subjectId: 'tme_1',
      })
    )
    const payload = (
      automation.appendOutboxEvent as unknown as {
        mock: { calls: Array<[unknown, Record<string, Record<string, unknown>>]> }
      }
    ).mock.calls[0][1].payload as Record<string, unknown>
    expect(payload).toMatchObject({
      organizationId: 'org_1',
      projectId: 'prj_1',
      userId: 'user_1',
    })
  })

  it('writes no outbox row when the transaction rolls back', async () => {
    repository.transaction.mockRejectedValue(new Error('db down'))

    await expect(service.createTimeEntry('org_1', body)).rejects.toThrow(
      'db down'
    )
    expect(automation.appendOutboxEvent).not.toHaveBeenCalled()
  })
})
