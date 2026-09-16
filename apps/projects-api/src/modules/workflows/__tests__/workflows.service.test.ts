import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repository, tenants, workStructure } = vi.hoisted(() => ({
  repository: {
    listTransitionsForType: vi.fn(),
    replaceBlueprint: vi.fn(),
  },
  tenants: { resolveTenant: vi.fn() },
  workStructure: {
    resolveWorkItemTypeById: vi.fn(),
    resolveWorkflowStateByKey: vi.fn(),
  },
}))

vi.mock('../workflows.repository.js', () => repository)
vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../../work-structure/index.js', () => workStructure)

const service = await import('../workflows.service.js')

const tenant = { id: 'prjten_1', organizationId: 'org_1' }
const workItemType = { id: 'wit_1', key: 'task' }

function transitionRow(overrides = {}) {
  return {
    id: 'wft_1',
    tenantId: tenant.id,
    workItemTypeId: 'wit_1',
    fromStateKey: 'todo',
    toStateKey: 'in-progress',
    name: 'Start',
    requiredPermission: null,
    requiredFieldKeys: [],
    requiresComment: false,
    createdAt: 1000n,
    updatedAt: 1000n,
    ...overrides,
  }
}

beforeEach(() => {
  tenants.resolveTenant.mockResolvedValue(tenant)
  workStructure.resolveWorkItemTypeById.mockResolvedValue(workItemType)
  workStructure.resolveWorkflowStateByKey.mockImplementation(
    async (_tenantId: string, key: string) => ({ id: `wfs_${key}`, key })
  )
  repository.listTransitionsForType.mockResolvedValue([])
  repository.replaceBlueprint.mockImplementation(
    async (_tenantId: string, _typeId: string, transitions: unknown[]) =>
      (transitions as Array<Record<string, unknown>>).map((transition, index) => ({
        ...transition,
        id: `wft_${index}`,
      }))
  )
})

describe('getBlueprint', () => {
  it('returns an empty blueprint with null updatedAt when no transitions exist', async () => {
    const result = await service.getBlueprint('org_1', 'wit_1')

    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({
      object: 'projects.workflow-blueprint',
      workItemTypeId: 'wit_1',
      updatedAt: null,
      transitions: [],
    })
  })

  it('returns transitions sorted with the newest update time', async () => {
    repository.listTransitionsForType.mockResolvedValue([
      transitionRow({ id: 'wft_old', toStateKey: 'done', updatedAt: 1000n }),
      transitionRow({ id: 'wft_new', toStateKey: 'done', updatedAt: 2000n }),
    ])

    const result = await service.getBlueprint('org_1', 'wit_1')

    expect(result.error).toBeNull()
    expect(result.data?.updatedAt).toBe(2000)
    expect(result.data?.transitions).toHaveLength(2)
  })

  it('fails when the tenant is unknown', async () => {
    tenants.resolveTenant.mockResolvedValue(null)

    const result = await service.getBlueprint('org_missing', 'wit_1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/tenant-not-found')
  })

  it('fails when the work item type is unknown', async () => {
    workStructure.resolveWorkItemTypeById.mockResolvedValue(null)

    const result = await service.getBlueprint('org_1', 'wit_missing')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/work-item-type-not-found')
  })
})

describe('putBlueprint', () => {
  it('stores transitions for the type', async () => {
    const result = await service.putBlueprint('org_1', 'wit_1', {
      transitions: [
        { fromStateKey: 'todo', toStateKey: 'in-progress', name: 'Start' },
        { fromStateKey: null, toStateKey: 'canceled', name: 'Cancel' },
      ],
    })

    expect(result.error).toBeNull()
    expect(repository.replaceBlueprint).toHaveBeenCalledWith(
      tenant.id,
      'wit_1',
      expect.arrayContaining([
        expect.objectContaining({ toStateKey: 'in-progress' }),
        expect.objectContaining({ fromStateKey: null }),
      ])
    )
    expect(result.data?.transitions).toHaveLength(2)
  })

  it('rejects duplicate from/to pairs', async () => {
    const result = await service.putBlueprint('org_1', 'wit_1', {
      transitions: [
        { fromStateKey: 'todo', toStateKey: 'done', name: 'One' },
        { fromStateKey: 'todo', toStateKey: 'done', name: 'Two' },
      ],
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/invalid-request')
    expect(repository.replaceBlueprint).not.toHaveBeenCalled()
  })

  it('treats two null-from transitions to the same state as duplicates', async () => {
    const result = await service.putBlueprint('org_1', 'wit_1', {
      transitions: [
        { toStateKey: 'done', name: 'One' },
        { fromStateKey: null, toStateKey: 'done', name: 'Two' },
      ],
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/invalid-request')
  })

  it('rejects unknown to-state keys', async () => {
    workStructure.resolveWorkflowStateByKey.mockImplementation(
      async (_tenantId: string, key: string) =>
        key === 'nope' ? null : { id: `wfs_${key}`, key }
    )

    const result = await service.putBlueprint('org_1', 'wit_1', {
      transitions: [{ fromStateKey: 'todo', toStateKey: 'nope', name: 'Bad' }],
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/workflow-state-not-found')
  })

  it('rejects unknown from-state keys', async () => {
    workStructure.resolveWorkflowStateByKey.mockImplementation(
      async (_tenantId: string, key: string) =>
        key === 'nope' ? null : { id: `wfs_${key}`, key }
    )

    const result = await service.putBlueprint('org_1', 'wit_1', {
      transitions: [{ fromStateKey: 'nope', toStateKey: 'done', name: 'Bad' }],
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/workflow-state-not-found')
  })

  it('replaces the whole blueprint on every PUT', async () => {
    await service.putBlueprint('org_1', 'wit_1', {
      transitions: [{ fromStateKey: 'todo', toStateKey: 'done', name: 'Ship' }],
    })

    expect(repository.replaceBlueprint).toHaveBeenCalledTimes(1)
  })
})

describe('checkTransition', () => {
  const base = {
    tenantId: tenant.id,
    workItemTypeId: 'wit_1',
    fromStateKey: 'todo',
    toStateKey: 'in-progress',
    fieldValues: {},
  }

  it('allows every change when the type has no transitions', async () => {
    repository.listTransitionsForType.mockResolvedValue([])

    const result = await service.checkTransition(base)

    expect(result).toEqual({ data: null, error: null })
  })

  it('allows a matching from/to pair', async () => {
    repository.listTransitionsForType.mockResolvedValue([transitionRow()])

    const result = await service.checkTransition(base)

    expect(result.error).toBeNull()
  })

  it('matches null-from transitions from any state', async () => {
    repository.listTransitionsForType.mockResolvedValue([
      transitionRow({ fromStateKey: null, toStateKey: 'in-progress' }),
    ])

    const result = await service.checkTransition({
      ...base,
      fromStateKey: 'in-review',
    })

    expect(result.error).toBeNull()
  })

  it('denies a change with no matching transition', async () => {
    repository.listTransitionsForType.mockResolvedValue([transitionRow()])

    const result = await service.checkTransition({
      ...base,
      toStateKey: 'done',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/transition-not-allowed')
  })

  it('denies a missing required permission', async () => {
    repository.listTransitionsForType.mockResolvedValue([
      transitionRow({ requiredPermission: 'issues:ship' }),
    ])

    const result = await service.checkTransition({ ...base, permissions: [] })

    expect(result.error?.code).toBe('projects/transition-requirements-unmet')
    expect(result.error?.param).toContain('permission:issues:ship')
  })

  it('allows the change when the required permission is present', async () => {
    repository.listTransitionsForType.mockResolvedValue([
      transitionRow({ requiredPermission: 'issues:ship' }),
    ])

    const result = await service.checkTransition({
      ...base,
      permissions: ['issues:ship'],
    })

    expect(result.error).toBeNull()
  })

  it('denies missing required fields', async () => {
    repository.listTransitionsForType.mockResolvedValue([
      transitionRow({ requiredFieldKeys: ['assignee', 'dueDate'] }),
    ])

    const result = await service.checkTransition({
      ...base,
      fieldValues: { assignee: 'user_1', dueDate: null },
    })

    expect(result.error?.code).toBe('projects/transition-requirements-unmet')
    expect(result.error?.param).toContain('dueDate')
    expect(result.error?.param).not.toContain('assignee')
  })

  it('allows the change when required fields are filled', async () => {
    repository.listTransitionsForType.mockResolvedValue([
      transitionRow({ requiredFieldKeys: ['assignee'] }),
    ])

    const result = await service.checkTransition({
      ...base,
      fieldValues: { assignee: 'user_1' },
    })

    expect(result.error).toBeNull()
  })

  it('denies a missing required comment', async () => {
    repository.listTransitionsForType.mockResolvedValue([
      transitionRow({ requiresComment: true }),
    ])

    const result = await service.checkTransition({ ...base, comment: '  ' })

    expect(result.error?.code).toBe('projects/transition-requirements-unmet')
    expect(result.error?.param).toContain('comment')
  })

  it('lists every missing requirement in one error', async () => {
    repository.listTransitionsForType.mockResolvedValue([
      transitionRow({
        requiredPermission: 'issues:ship',
        requiredFieldKeys: ['assignee'],
        requiresComment: true,
      }),
    ])

    const result = await service.checkTransition({ ...base, fieldValues: {} })

    expect(result.error?.code).toBe('projects/transition-requirements-unmet')
    expect(result.error?.param).toContain('permission:issues:ship')
    expect(result.error?.param).toContain('assignee')
    expect(result.error?.param).toContain('comment')
  })
})
