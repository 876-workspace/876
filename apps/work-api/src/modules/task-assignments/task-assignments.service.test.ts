import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createWorkTaskAssignmentInputSchema,
  updateWorkTaskAssignmentInputSchema,
} from '@876/work'

vi.mock('../tasks/index.js', () => ({
  retrieve: vi.fn(),
  update: vi.fn(),
}))
vi.mock('./task-assignments.repository.js', () => ({
  list: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  respond: vi.fn(),
  remove: vi.fn(),
}))

import * as tasks from '../tasks/index.js'
import * as repository from './task-assignments.repository.js'
import * as service from './task-assignments.service.js'

const task = {
  id: 'task_kingston_1',
  organizationId: 'org_kingston_1',
  assigneeId: null,
  title: 'Prepare handover',
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'assign_1',
    taskId: task.id,
    targetType: 'USER' as const,
    assigneeId: 'user_mandeville_1',
    role: 'OWNER' as const,
    status: 'PENDING' as const,
    assignedBy: 'user_kingston_1',
    assignedAt: new Date('2026-08-30T12:00:00.000Z'),
    respondedAt: null,
    completedAt: null,
    delegatedFromAssignmentId: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(tasks.retrieve).mockResolvedValue(task as never)
  vi.mocked(tasks.update).mockResolvedValue(task as never)
  vi.mocked(repository.list).mockResolvedValue([])
  vi.mocked(repository.retrieve).mockResolvedValue(null)
  vi.mocked(repository.respond).mockResolvedValue(null)
})

describe('Work task-assignments service', () => {
  it('create assigns USER as OWNER and updates task assignee when task has no assignee', async () => {
    vi.mocked(repository.create).mockResolvedValue(row() as never)
    const result = await service.create('org_kingston_1', task.id, {
      targetType: 'USER',
      assigneeId: 'user_mandeville_1',
      assignedBy: 'user_kingston_1',
    })
    expect(result).toEqual(
      expect.objectContaining({
        targetType: 'USER',
        assigneeId: 'user_mandeville_1',
      })
    )
    expect(repository.create).toHaveBeenCalledTimes(1)
    expect(tasks.update).toHaveBeenCalledWith('org_kingston_1', task.id, {
      assigneeId: 'user_mandeville_1',
    })
  })

  it('create does not update task assignee when task already has assignee', async () => {
    vi.mocked(tasks.retrieve).mockResolvedValue({
      ...task,
      assigneeId: 'user_existing',
    } as never)
    vi.mocked(repository.create).mockResolvedValue(
      row({ role: 'OWNER' }) as never
    )
    await service.create('org_kingston_1', task.id, {
      targetType: 'USER',
      assigneeId: 'user_new',
      assignedBy: 'user_1',
    })
    expect(tasks.update).not.toHaveBeenCalled()
  })

  it('create with TEAM target does not touch task assignee', async () => {
    vi.mocked(repository.create).mockResolvedValue(
      row({ targetType: 'TEAM', assigneeId: 'team_spanish_town_1' }) as never
    )
    await service.create('org_kingston_1', task.id, {
      targetType: 'TEAM',
      assigneeId: 'team_spanish_town_1',
      assignedBy: 'user_1',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'TEAM' })
    )
    expect(tasks.update).not.toHaveBeenCalled()
  })

  it('create with delegatedFromAssignmentId validates source exists', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ id: 'assign_parent' }) as never
    )
    vi.mocked(repository.create).mockResolvedValue(
      row({ delegatedFromAssignmentId: 'assign_parent' }) as never
    )
    const result = await service.create('org_kingston_1', task.id, {
      targetType: 'USER',
      assigneeId: 'user_2',
      assignedBy: 'user_1',
      delegatedFromAssignmentId: 'assign_parent',
    })
    expect(result).toEqual(
      expect.objectContaining({ delegatedFromAssignmentId: 'assign_parent' })
    )
    expect(repository.retrieve).toHaveBeenCalledWith(task.id, 'assign_parent')
  })

  it('create with delegatedFromAssignmentId returns null when source missing and never creates', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.create('org_kingston_1', task.id, {
      targetType: 'USER',
      assigneeId: 'user_2',
      assignedBy: 'user_1',
      delegatedFromAssignmentId: 'missing',
    })
    expect(result).toBeNull()
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('create with status COMPLETED stamps completedAt and respondedAt', async () => {
    vi.mocked(repository.create).mockResolvedValue(
      row({ status: 'COMPLETED' }) as never
    )
    await service.create('org_kingston_1', task.id, {
      targetType: 'USER',
      assigneeId: 'user_1',
      assignedBy: 'user_1',
      status: 'COMPLETED',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'COMPLETED',
        completedAt: expect.any(Date),
        respondedAt: expect.any(Date),
      })
    )
  })

  it('create with status PENDING leaves timestamps null', async () => {
    vi.mocked(repository.create).mockResolvedValue(
      row({ status: 'PENDING' }) as never
    )
    await service.create('org_kingston_1', task.id, {
      targetType: 'USER',
      assigneeId: 'user_1',
      assignedBy: 'user_1',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ respondedAt: null, completedAt: null })
    )
  })

  it('list returns assignments for task', async () => {
    vi.mocked(repository.list).mockResolvedValue([
      row({ id: 'assign_a' }),
      row({ id: 'assign_b' }),
    ] as never)
    const result = (await service.list('org_kingston_1', task.id)) as {
      data: unknown[]
    }
    expect(result.data).toHaveLength(2)
    expect(repository.list).toHaveBeenCalledWith(task.id)
  })

  it('list returns tenant error when task belongs to another tenant and never lists', async () => {
    const err = { code: 'work/tenant-not-found', message: 'x', httpStatus: 404 }
    vi.mocked(tasks.retrieve).mockResolvedValue(err as never)
    const result = await service.list('org_kingston_1', task.id)
    expect(result).toEqual(err)
    expect(repository.list).not.toHaveBeenCalled()
  })

  it('list returns null when task not found', async () => {
    vi.mocked(tasks.retrieve).mockResolvedValue(null as never)
    const result = await service.list('org_kingston_1', 'missing')
    expect(result).toBeNull()
    expect(repository.list).not.toHaveBeenCalled()
  })

  it('update accepts assignment and stamps respondedAt', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ id: 'assign_1', status: 'PENDING', completedAt: null }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({ id: 'assign_1', status: 'ACCEPTED' }) as never
    )
    const result = await service.update('org_kingston_1', task.id, 'assign_1', {
      status: 'ACCEPTED',
    })
    expect(result).toEqual(expect.objectContaining({ status: 'ACCEPTED' }))
    expect(repository.update).toHaveBeenCalledWith(
      'assign_1',
      expect.objectContaining({
        status: 'ACCEPTED',
        respondedAt: expect.any(Date),
      })
    )
  })

  it('update declines assignment', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ status: 'PENDING' }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({ status: 'DECLINED' }) as never
    )
    await service.update('org_kingston_1', task.id, 'assign_1', {
      status: 'DECLINED',
    })
    expect(repository.update).toHaveBeenCalledWith(
      'assign_1',
      expect.objectContaining({ status: 'DECLINED' })
    )
  })

  it('update completes assignment stamps completedAt', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ status: 'ACCEPTED', completedAt: null }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({ status: 'COMPLETED' }) as never
    )
    await service.update('org_kingston_1', task.id, 'assign_1', {
      status: 'COMPLETED',
    })
    expect(repository.update).toHaveBeenCalledWith(
      'assign_1',
      expect.objectContaining({ completedAt: expect.any(Date) })
    )
  })

  it('update resetting to PENDING clears respondedAt', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ status: 'ACCEPTED' }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({ status: 'PENDING' }) as never
    )
    await service.update('org_kingston_1', task.id, 'assign_1', {
      status: 'PENDING',
    })
    expect(repository.update).toHaveBeenCalledWith(
      'assign_1',
      expect.objectContaining({ respondedAt: null })
    )
  })

  it('update returns null when assignment not found and never calls update', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.update('org_kingston_1', task.id, 'missing', {
      status: 'ACCEPTED',
    })
    expect(result).toBeNull()
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('update allows second OWNER assignment - service does not block it', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ role: 'OWNER' }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({ role: 'OWNER' }) as never
    )
    const result = await service.update('org_kingston_1', task.id, 'assign_1', {
      role: 'OWNER',
    })
    expect(result).toEqual(expect.objectContaining({ role: 'OWNER' }))
  })

  it('remove deletes assignment', async () => {
    vi.mocked(repository.remove).mockResolvedValue({
      object: 'task_assignment',
      id: 'assign_1',
      deleted: true,
    } as never)
    const result = await service.remove('org_kingston_1', task.id, 'assign_1')
    expect(result).toEqual(expect.objectContaining({ deleted: true }))
    expect(repository.remove).toHaveBeenCalledWith(task.id, 'assign_1')
  })

  it('create returns task tenant error and never creates when task in another tenant', async () => {
    const err = { code: 'work/tenant-not-found', message: 'x', httpStatus: 404 }
    vi.mocked(tasks.retrieve).mockResolvedValue(err as never)
    const result = await service.create('org_kingston_1', task.id, {
      targetType: 'USER',
      assigneeId: 'user_1',
      assignedBy: 'user_1',
    })
    expect(result).toEqual(err)
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('create persists role default OWNER and status default PENDING', async () => {
    vi.mocked(repository.create).mockResolvedValue(row() as never)
    await service.create('org_kingston_1', task.id, {
      targetType: 'USER',
      assigneeId: 'user_mandeville_1',
      assignedBy: 'user_kingston_1',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'OWNER', status: 'PENDING' })
    )
  })

  it('create with COLLABORATOR role does not touch the task assignee', async () => {
    vi.mocked(tasks.retrieve).mockResolvedValue({
      ...task,
      assigneeId: null,
    } as never)
    vi.mocked(repository.create).mockResolvedValue(
      row({ role: 'COLLABORATOR' }) as never
    )
    await service.create('org_kingston_1', task.id, {
      targetType: 'USER',
      assigneeId: 'user_mandeville_1',
      role: 'COLLABORATOR',
      assignedBy: 'user_kingston_1',
    })
    expect(tasks.update).not.toHaveBeenCalled()
  })

  it('create with status DECLINED stamps respondedAt but not completedAt', async () => {
    vi.mocked(repository.create).mockResolvedValue(
      row({ status: 'DECLINED' }) as never
    )
    await service.create('org_kingston_1', task.id, {
      targetType: 'USER',
      assigneeId: 'user_1',
      status: 'DECLINED',
      assignedBy: 'user_1',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'DECLINED',
        respondedAt: expect.any(Date),
        completedAt: null,
      })
    )
  })

  it('create accepts a delegated assignment payload via the real schema', () => {
    const parsed = createWorkTaskAssignmentInputSchema.parse({
      targetType: 'TEAM',
      assigneeId: 'team_spanish_town_1',
      role: 'REVIEWER',
      status: 'ACCEPTED',
      assignedBy: 'user_kingston_1',
      delegatedFromAssignmentId: 'assign_parent',
    })
    expect(parsed.delegatedFromAssignmentId).toBe('assign_parent')
    expect(parsed.role).toBe('REVIEWER')
  })

  it('rejects an assignment payload with an unknown status via the real schema', () => {
    expect(() =>
      createWorkTaskAssignmentInputSchema.parse({
        targetType: 'USER',
        assigneeId: 'user_1',
        status: 'ARCHIVED',
        assignedBy: 'user_1',
      })
    ).toThrow()
  })

  it('rejects an empty assignment update payload via the real schema', () => {
    expect(() => updateWorkTaskAssignmentInputSchema.parse({})).toThrow()
  })

  it('serializes the assignment with object discriminator and stamped timestamps', async () => {
    vi.mocked(repository.list).mockResolvedValue([
      row({ id: 'assign_1', assignedAt: new Date('2026-08-30T12:00:00.000Z') }),
    ] as never)
    const result = (await service.list('org_kingston_1', task.id)) as {
      data: unknown[]
    }
    expect(result.data).toEqual([
      {
        object: 'task_assignment',
        id: 'assign_1',
        taskId: task.id,
        targetType: 'USER',
        assigneeId: 'user_mandeville_1',
        role: 'OWNER',
        status: 'PENDING',
        assignedBy: 'user_kingston_1',
        assignedAt: 1_788_091_200,
        respondedAt: null,
        completedAt: null,
        delegatedFromAssignmentId: null,
      },
    ])
  })

  it('update from COMPLETED back to PENDING clears respondedAt and completedAt', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({
        status: 'COMPLETED',
        respondedAt: new Date(),
        completedAt: new Date(),
      }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({ status: 'PENDING' }) as never
    )
    await service.update('org_kingston_1', task.id, 'assign_1', {
      status: 'PENDING',
    })
    expect(repository.update).toHaveBeenCalledWith(
      'assign_1',
      expect.objectContaining({
        status: 'PENDING',
        respondedAt: null,
        completedAt: null,
      })
    )
  })

  it('update completing an already-completed assignment keeps the existing completedAt', async () => {
    const completedAt = new Date('2026-08-29T12:00:00.000Z')
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({
        status: 'COMPLETED',
        respondedAt: completedAt,
        completedAt,
      }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({ status: 'COMPLETED', completedAt }) as never
    )
    await service.update('org_kingston_1', task.id, 'assign_1', {
      status: 'COMPLETED',
    })
    expect(repository.update).toHaveBeenCalledWith(
      'assign_1',
      expect.objectContaining({ completedAt, respondedAt: expect.any(Date) })
    )
  })

  it('update changing the role only leaves status untouched', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ status: 'ACCEPTED' }) as never
    )
    await service.update('org_kingston_1', task.id, 'assign_1', {
      role: 'REVIEWER',
    })
    expect(repository.update).toHaveBeenCalledWith('assign_1', {
      role: 'REVIEWER',
      completedAt: null,
    })
  })

  it('update returns task tenant error and never touches the repository', async () => {
    const err = { code: 'work/tenant-inactive', message: 'x', httpStatus: 409 }
    vi.mocked(tasks.retrieve).mockResolvedValue(err as never)
    const result = await service.update('org_kingston_1', task.id, 'assign_1', {
      status: 'ACCEPTED',
    })
    expect(result).toEqual(err)
    expect(repository.retrieve).not.toHaveBeenCalled()
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('lets the exact USER assignee accept a pending assignment atomically', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row() as never)
    vi.mocked(repository.respond).mockResolvedValue(
      row({ status: 'ACCEPTED', respondedAt: new Date() }) as never
    )

    const result = await service.respond(
      'org_kingston_1',
      task.id,
      'assign_1',
      'user_mandeville_1',
      'ACCEPTED'
    )

    expect(result).toEqual(expect.objectContaining({ status: 'ACCEPTED' }))
    expect(repository.respond).toHaveBeenCalledWith(
      task.id,
      'assign_1',
      'user_mandeville_1',
      'PENDING',
      expect.objectContaining({
        status: 'ACCEPTED',
        respondedAt: expect.any(Date),
        completedAt: null,
      })
    )
  })

  it('rejects self-response by another user without writing', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row() as never)

    const result = await service.respond(
      'org_kingston_1',
      task.id,
      'assign_1',
      'user_other',
      'ACCEPTED'
    )

    expect(result).toMatchObject({ code: 'work/session-forbidden' })
    expect(repository.respond).not.toHaveBeenCalled()
  })

  it('rejects nonsensical self-response transitions', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ status: 'DECLINED' }) as never
    )

    const result = await service.respond(
      'org_kingston_1',
      task.id,
      'assign_1',
      'user_mandeville_1',
      'COMPLETED'
    )

    expect(result).toMatchObject({ code: 'work/invalid-request' })
    expect(repository.respond).not.toHaveBeenCalled()
  })

  it('treats a raced self-response as an invalid transition', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row() as never)
    vi.mocked(repository.respond).mockResolvedValue(null)

    const result = await service.respond(
      'org_kingston_1',
      task.id,
      'assign_1',
      'user_mandeville_1',
      'ACCEPTED'
    )

    expect(result).toMatchObject({ code: 'work/invalid-request' })
  })

  it('remove returns null when the task does not exist and never removes', async () => {
    vi.mocked(tasks.retrieve).mockResolvedValue(null as never)
    const result = await service.remove('org_kingston_1', 'missing', 'assign_1')
    expect(result).toBeNull()
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('remove returns task tenant error and never removes when task in another tenant', async () => {
    const err = { code: 'work/tenant-not-found', message: 'x', httpStatus: 404 }
    vi.mocked(tasks.retrieve).mockResolvedValue(err as never)
    const result = await service.remove('org_kingston_1', task.id, 'assign_1')
    expect(result).toEqual(err)
    expect(repository.remove).not.toHaveBeenCalled()
  })
})
