import { expectValue } from '../../../test/expect-value.js'
import { getError } from '@876/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateTaskInput, UpdateTaskInput } from '../../../types/task.js'

const { priorities, context, repo } = vi.hoisted(() => ({
  priorities: {
    requireActiveForTenant: vi.fn(),
    retrieveDefaultForTenant: vi.fn(),
    serialize: vi.fn((p: unknown) => p),
  },
  context: { requireRequestContext: vi.fn() },
  repo: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))

vi.mock('../../requests/index.js', () => context)
vi.mock('../tasks.repository.js', () => repo)
vi.mock('../../priorities/index.js', () => priorities)

const service = await import('../tasks.service.js')

const tenantId = 'crm_tnt_1'
const requestId = 'crm_req_1'
const normal = {
  id: 'crm_pri_normal',
  object: 'request_priority',
  name: 'Normal',
  weight: 20,
}
const urgent = {
  id: 'crm_pri_urgent',
  object: 'request_priority',
  name: 'Urgent',
  weight: 40,
}

function taskRow(overrides: Record<string, unknown> = {}) {
  const at = new Date('2026-08-26T12:00:00.000Z')
  return {
    id: 'crm_task_1',
    tenantId,
    requestId,
    title: 'Task',
    description: null,
    status: 'OPEN' as const,
    priorityId: normal.id,
    priority: normal,
    assigneeId: null,
    dueAt: null,
    completedAt: null,
    completedBy: null,
    sortOrder: 0,
    createdBy: 'usr_1',
    createdAt: at,
    updatedAt: at,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  context.requireRequestContext.mockResolvedValue({ tenantId, requestId })
  priorities.requireActiveForTenant.mockImplementation(
    async (_tid: string, pid: string) => {
      if (pid === normal.id)
        return normal as unknown as Awaited<
          ReturnType<typeof priorities.requireActiveForTenant>
        >
      if (pid === urgent.id)
        return urgent as unknown as Awaited<
          ReturnType<typeof priorities.requireActiveForTenant>
        >
      throw { code: 'crm/priority-not-found' }
    }
  )
  priorities.retrieveDefaultForTenant.mockResolvedValue(
    normal as unknown as Awaited<
      ReturnType<typeof priorities.retrieveDefaultForTenant>
    >
  )
  priorities.serialize.mockImplementation(
    (p) => p as unknown as ReturnType<typeof priorities.serialize>
  )
  repo.list.mockResolvedValue([])
  repo.retrieve.mockResolvedValue(taskRow())
  repo.create.mockResolvedValue(taskRow())
  repo.update.mockResolvedValue(taskRow())
  repo.remove.mockResolvedValue({
    object: 'request_task',
    id: 'crm_task_1',
    deleted: true,
  })
})

describe('tasks.service.advanced - list edge cases', () => {
  it('returns empty list when no tasks', async () => {
    repo.list.mockResolvedValue([])
    expect(await service.list('org_1', requestId)).toEqual([])
  })

  it('propagates request-not-found', async () => {
    context.requireRequestContext.mockResolvedValue(
      getError('crm/request-not-found')
    )
    await expect(service.list('org_1', requestId)).resolves.toMatchObject({
      code: 'crm/request-not-found',
    })
  })

  it('serializes multiple rows preserving sortOrder and status', async () => {
    repo.list.mockResolvedValue([
      taskRow({ id: 't1', sortOrder: 1, status: 'OPEN' }),
      taskRow({ id: 't2', sortOrder: 2, status: 'DONE' }),
    ])
    const tasks = expectValue(await service.list('org_1', requestId))
    expect(tasks).toHaveLength(2)
    expect(tasks[0].sortOrder).toBe(1)
    expect(tasks[1].status).toBe('DONE')
  })

  it('embeds priority object from priorities.serialize', async () => {
    priorities.serialize.mockReturnValue({
      object: 'request_priority',
      id: normal.id,
      name: 'Normal',
    } as unknown as ReturnType<typeof priorities.serialize>)
    repo.list.mockResolvedValue([taskRow()])
    const [task] = expectValue(await service.list('org_1', requestId))
    expect(priorities.serialize).toHaveBeenCalledWith(normal)
    expect(task.priority).toMatchObject({ id: normal.id })
  })
})

describe('tasks.service.advanced - create priority resolution', () => {
  it('uses explicit priorityId without fetching default', async () => {
    await service.create('org_1', requestId, {
      title: 'T',
      createdBy: 'usr_1',
      priorityId: urgent.id,
    } as unknown as CreateTaskInput)
    expect(priorities.requireActiveForTenant).toHaveBeenCalledWith(
      tenantId,
      urgent.id
    )
    expect(priorities.retrieveDefaultForTenant).not.toHaveBeenCalled()
  })

  it('falls back to default when no priorityId supplied', async () => {
    await service.create('org_1', requestId, {
      title: 'T',
      createdBy: 'usr_1',
    } as unknown as CreateTaskInput)
    expect(priorities.retrieveDefaultForTenant).toHaveBeenCalledWith(tenantId)
  })

  it('throws when tenant has no default and no explicit priority', async () => {
    priorities.retrieveDefaultForTenant.mockResolvedValue(null)
    await expect(
      service.create('org_1', requestId, {
        title: 'T',
        createdBy: 'usr_1',
      } as unknown as CreateTaskInput)
    ).resolves.toMatchObject({ code: 'crm/priority-not-found' })
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('throws when explicit priority is inactive/not-found', async () => {
    priorities.requireActiveForTenant.mockResolvedValue(
      getError('crm/priority-not-found')
    )
    await expect(
      service.create('org_1', requestId, {
        title: 'T',
        createdBy: 'usr_1',
        priorityId: 'bad',
      } as unknown as CreateTaskInput)
    ).resolves.toMatchObject({ code: 'crm/priority-not-found' })
  })

  it('converts dueAt correctly', async () => {
    const secs = Math.floor(Date.parse('2026-09-01T09:00:00.000Z') / 1000)
    await service.create('org_1', requestId, {
      title: 'T',
      createdBy: 'usr_1',
      dueAt: secs,
    } as unknown as CreateTaskInput)
    const call = repo.create.mock.calls[0][0] as unknown as Record<string, unknown>
    expect(call.dueAt).toBeInstanceOf(Date)
    expect((call.dueAt as Date).toISOString()).toBe('2026-09-01T09:00:00.000Z')
  })

  it('stores dueAt null when explicitly null', async () => {
    await service.create('org_1', requestId, {
      title: 'T',
      createdBy: 'usr_1',
      dueAt: null,
    } as unknown as CreateTaskInput)
    expect(
      (repo.create.mock.calls[0][0] as unknown as Record<string, unknown>).dueAt
    ).toBeNull()
  })

  it('propagates tenant errors without writing', async () => {
    context.requireRequestContext.mockResolvedValue(
      getError('crm/tenant-not-found')
    )
    await expect(
      service.create('org_1', requestId, {
        title: 'T',
        createdBy: 'usr_1',
      } as unknown as CreateTaskInput)
    ).resolves.toMatchObject({ code: 'crm/tenant-not-found' })
    expect(repo.create).not.toHaveBeenCalled()
  })
})

describe('tasks.service.advanced - update completion stamping', () => {
  it('stamps completedAt/by when moving to DONE first time', async () => {
    repo.retrieve.mockResolvedValue(taskRow({ completedAt: null }))
    await service.update('org_1', requestId, 'crm_task_1', {
      status: 'DONE',
      completedBy: 'usr_2',
    } as unknown as UpdateTaskInput)
    const payload = repo.update.mock.calls[0][1] as unknown as Record<string, unknown>
    expect(payload.completedAt).toBeInstanceOf(Date)
    expect(payload.completedBy).toBe('usr_2')
  })

  it('does not re-stamp if already DONE', async () => {
    const completedAt = new Date('2026-08-27T00:00:00.000Z')
    repo.retrieve.mockResolvedValue(
      taskRow({ completedAt, completedBy: 'usr_1', status: 'DONE' as const })
    )
    // Update with DONE again should not add new stamp logic? service checks !current.completedAt
    await service.update('org_1', requestId, 'crm_task_1', {
      status: 'DONE',
    } as unknown as UpdateTaskInput)
    const payload = repo.update.mock.calls[0][1] as unknown as Record<string, unknown>
    // When already completed, it should not add completedAt again (falls through to {})
    expect(payload.completedAt).toBeUndefined()
  })

  it('clears completedAt/by when moving away from DONE', async () => {
    const completedAt = new Date('2026-08-27T00:00:00.000Z')
    repo.retrieve.mockResolvedValue(
      taskRow({ completedAt, status: 'DONE' as const })
    )
    await service.update('org_1', requestId, 'crm_task_1', {
      status: 'OPEN',
    } as unknown as UpdateTaskInput)
    const payload = repo.update.mock.calls[0][1] as unknown as Record<string, unknown>
    expect(payload.completedAt).toBeNull()
    expect(payload.completedBy).toBeNull()
  })

  it('converts dueAt on update', async () => {
    const secs = Math.floor(Date.parse('2026-09-03T10:00:00.000Z') / 1000)
    repo.retrieve.mockResolvedValue(taskRow())
    await service.update('org_1', requestId, 'crm_task_1', {
      dueAt: secs,
    } as unknown as UpdateTaskInput)
    expect(
      (repo.update.mock.calls[0][1] as unknown as Record<string, unknown>).dueAt
    ).toBeInstanceOf(Date)
  })

  it('leaves dueAt untouched when undefined', async () => {
    repo.retrieve.mockResolvedValue(taskRow())
    await service.update('org_1', requestId, 'crm_task_1', {
      title: 'new',
    } as unknown as UpdateTaskInput)
    expect(
      (repo.update.mock.calls[0][1] as unknown as Record<string, unknown>).dueAt
    ).toBeUndefined()
  })

  it('validates changed priorityId', async () => {
    repo.retrieve.mockResolvedValue(taskRow())
    await service.update('org_1', requestId, 'crm_task_1', {
      priorityId: urgent.id,
    } as unknown as UpdateTaskInput)
    expect(priorities.requireActiveForTenant).toHaveBeenCalledWith(
      tenantId,
      urgent.id
    )
  })

  it('does not validate priority when not changed', async () => {
    repo.retrieve.mockResolvedValue(taskRow())
    await service.update('org_1', requestId, 'crm_task_1', {
      title: 'x',
    } as unknown as UpdateTaskInput)
    expect(priorities.requireActiveForTenant).not.toHaveBeenCalled()
  })

  it('returns null when task missing', async () => {
    repo.retrieve.mockResolvedValue(null)
    expect(
      await service.update('org_1', requestId, 'missing', {
        title: 'x',
      } as unknown as UpdateTaskInput)
    ).toBeNull()
  })
})

describe('tasks.service.advanced - remove', () => {
  it('returns null when missing', async () => {
    repo.retrieve.mockResolvedValue(null)
    expect(
      await service.remove('org_1', requestId, 'missing', 'usr_1')
    ).toBeNull()
    expect(repo.remove).not.toHaveBeenCalled()
  })

  it('removes existing task', async () => {
    repo.retrieve.mockResolvedValue(taskRow())
    expect(
      await service.remove('org_1', requestId, 'crm_task_1', 'usr_1')
    ).toEqual({ object: 'request_task', id: 'crm_task_1', deleted: true })
    expect(repo.remove).toHaveBeenCalledWith('crm_task_1', 'usr_1')
  })

  it('propagates context errors', async () => {
    context.requireRequestContext.mockResolvedValue(
      getError('crm/request-not-found')
    )
    await expect(
      service.remove('org_1', requestId, 'crm_task_1', 'usr_1')
    ).resolves.toMatchObject({ code: 'crm/request-not-found' })
  })
})
