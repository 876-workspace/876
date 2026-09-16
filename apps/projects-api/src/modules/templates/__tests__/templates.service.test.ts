import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { InstantiateTransactionInput } from '../templates.repository.js'
import type { TemplateDefinition } from '../templates.schemas.js'

const {
  tenants,
  projects,
  workStructure,
  issues,
  labels,
  finance,
  templatesRepo,
} = vi.hoisted(() => ({
  tenants: { resolveTenant: vi.fn() },
  projects: {
    resolveProject: vi.fn(),
    retrieve: vi.fn(),
    deriveUniqueKey: vi.fn(),
    deriveUniqueSlug: vi.fn(),
    isValidProjectKey: vi.fn(),
  },
  workStructure: {
    listWorkItemTypes: vi.fn(),
    listWorkflowStates: vi.fn(),
    listMilestones: vi.fn(),
    listTaskLists: vi.fn(),
    listCustomFields: vi.fn(),
  },
  issues: { list: vi.fn(), listDependenciesForIssueIds: vi.fn() },
  labels: { list: vi.fn() },
  finance: { listBudgets: vi.fn(), getBilling: vi.fn() },
  templatesRepo: {
    listTemplates: vi.fn(),
    retrieveTemplate: vi.fn(),
    retrieveTemplateByKey: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    softDeleteTemplate: vi.fn(),
    listTemplateVersions: vi.fn(),
    findInstantiation: vi.fn(),
    instantiateInTransaction: vi.fn(),
  },
}))

vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../../projects/index.js', () => projects)
vi.mock('../../work-structure/index.js', () => workStructure)
vi.mock('../../issues/index.js', () => issues)
vi.mock('../../labels/index.js', () => labels)
vi.mock('../../finance/index.js', () => finance)
vi.mock('../templates.repository.js', () => templatesRepo)

const service = await import('../templates.service.js')

const START = 1788000000

function definitionFixture(): TemplateDefinition {
  return {
    schemaVersion: 1,
    project: { description: null, status: 'active', health: 'on-track' },
    phases: [
      {
        ref: 'phase-a',
        key: 'a',
        name: 'Phase A',
        startOffsetDays: 0,
        durationDays: 7,
      },
    ],
    taskLists: [],
    workItems: [
      {
        ref: 'work-item-1',
        title: 'First',
        typeKey: 'task',
        stateKey: 'todo',
        labels: ['frontend'],
        startOffsetDays: 1,
        dueOffsetDays: 3,
      },
    ],
    dependencies: [],
    customFieldDefinitions: [],
    budgetDefaults: [],
  }
}

function templateRowFixture(definition: unknown) {
  return {
    id: 'prjtpl_1',
    tenantId: 'prjten_1',
    key: 'sprint-pack',
    name: 'Sprint pack',
    description: null,
    currentVersion: 1,
    definition,
    sourceProjectId: null,
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    createdAt: 1000n,
    updatedAt: 2000n,
  }
}

const projectFixture = {
  object: 'projects.project',
  id: 'prj_new',
  key: 'NEW',
  name: 'New project',
}

let capturedTransaction: InstantiateTransactionInput | null = null

beforeEach(() => {
  vi.clearAllMocks()
  capturedTransaction = null
  tenants.resolveTenant.mockResolvedValue({ id: 'prjten_1' })
  projects.resolveProject.mockResolvedValue(null)
  projects.isValidProjectKey.mockImplementation(
    (key: string) => /^[A-Z0-9]{2,10}$/.test(key),
  )
  projects.deriveUniqueKey.mockResolvedValue('GENKEY')
  projects.deriveUniqueSlug.mockResolvedValue('gen-slug')
  projects.retrieve.mockResolvedValue({ data: projectFixture, error: null })
  workStructure.listWorkItemTypes.mockResolvedValue({
    data: [{ id: 'wit_task', key: 'task', hierarchyLevel: 1 }],
    error: null,
  })
  workStructure.listWorkflowStates.mockResolvedValue({
    data: [{ id: 'wfs_todo', key: 'todo', category: 'unstarted' }],
    error: null,
  })
  workStructure.listMilestones.mockResolvedValue({ data: [], error: null })
  workStructure.listTaskLists.mockResolvedValue({ data: [], error: null })
  workStructure.listCustomFields.mockResolvedValue({ data: [], error: null })
  issues.list.mockResolvedValue({
    data: { items: [], hasMore: false, totalCount: 0 },
    error: null,
  })
  issues.listDependenciesForIssueIds.mockResolvedValue([])
  labels.list.mockResolvedValue({
    data: [{ id: 'lbl_front', name: 'frontend' }],
    error: null,
  })
  finance.listBudgets.mockResolvedValue({ data: [], error: null })
  finance.getBilling.mockResolvedValue({
    data: null,
    error: { code: 'projects/billing-config-not-found' },
  })
  templatesRepo.retrieveTemplate.mockResolvedValue(
    templateRowFixture(definitionFixture()),
  )
  templatesRepo.retrieveTemplateByKey.mockResolvedValue(null)
  templatesRepo.findInstantiation.mockResolvedValue(null)
  templatesRepo.instantiateInTransaction.mockImplementation(
    (input: InstantiateTransactionInput) => {
      capturedTransaction = input
      return Promise.resolve({ projectId: 'prj_new', replayed: false })
    },
  )
  templatesRepo.createTemplate.mockImplementation((params: {
    id: string
    tenantId: string
    key: string
    name: string
    description: string | null
    definition: unknown
    sourceProjectId: string | null
  }) =>
    Promise.resolve({
      ...templateRowFixture(params.definition),
      id: params.id,
      key: params.key,
      name: params.name,
      description: params.description,
      sourceProjectId: params.sourceProjectId,
    }),
  )
  templatesRepo.updateTemplate.mockImplementation(() =>
      Promise.resolve({
        ...templateRowFixture(definitionFixture()),
        currentVersion: 2,
      }),
  )
})

describe('instantiateTemplate validation', () => {
  it('reports missing type, state, and label keys together', async () => {
    const definition = definitionFixture()
    definition.workItems = [
      {
        ref: 'work-item-1',
        title: 'First',
        typeKey: 'ghost-type',
        stateKey: 'ghost-state',
        labels: ['ghost-label'],
      },
    ]
    templatesRepo.retrieveTemplate.mockResolvedValue(
      templateRowFixture(definition),
    )
    const result = await service.instantiateTemplate('org_1', 'prjtpl_1', {
      name: 'New',
      startDate: START,
    })
    expect(result.error?.code).toBe('projects/template-missing-references')
    expect(result.error?.description).toContain('ghost-type')
    expect(result.error?.description).toContain('ghost-state')
    expect(result.error?.description).toContain('ghost-label')
  })

  it('writes nothing when references are missing', async () => {
    const definition = definitionFixture()
    definition.workItems = [
      {
        ref: 'work-item-1',
        title: 'First',
        typeKey: 'ghost-type',
        stateKey: 'todo',
      },
    ]
    templatesRepo.retrieveTemplate.mockResolvedValue(
      templateRowFixture(definition),
    )
    const result = await service.instantiateTemplate('org_1', 'prjtpl_1', {
      name: 'New',
      startDate: START,
    })
    expect(result.error).not.toBeNull()
    expect(templatesRepo.instantiateInTransaction).not.toHaveBeenCalled()
  })

  it('rejects templates whose dependencies form a cycle', async () => {
    const definition = definitionFixture()
    definition.workItems = [
      { ref: 'a', title: 'A', typeKey: 'task', stateKey: 'todo' },
      { ref: 'b', title: 'B', typeKey: 'task', stateKey: 'todo' },
    ]
    definition.dependencies = [
      { fromRef: 'a', toRef: 'b' },
      { fromRef: 'b', toRef: 'a' },
    ]
    templatesRepo.retrieveTemplate.mockResolvedValue(
      templateRowFixture(definition),
    )
    const result = await service.instantiateTemplate('org_1', 'prjtpl_1', {
      name: 'New',
      startDate: START,
    })
    expect(result.error?.code).toBe('projects/template-dependency-cycle')
    expect(templatesRepo.instantiateInTransaction).not.toHaveBeenCalled()
  })

  it('rejects a colliding project key without writing', async () => {
    projects.resolveProject.mockResolvedValue({ id: 'prj_other' })
    const result = await service.instantiateTemplate('org_1', 'prjtpl_1', {
      name: 'New',
      key: 'TAKEN',
      startDate: START,
    })
    expect(result.error?.code).toBe('projects/project-key-taken')
    expect(templatesRepo.instantiateInTransaction).not.toHaveBeenCalled()
  })

  it('rejects a malformed project key without writing', async () => {
    const result = await service.instantiateTemplate('org_1', 'prjtpl_1', {
      name: 'New',
      key: 'lowercase',
      startDate: START,
    })
    expect(result.error?.code).toBe('projects/invalid-project-key')
    expect(templatesRepo.instantiateInTransaction).not.toHaveBeenCalled()
  })

  it('replays an idempotent instantiate without writing again', async () => {
    templatesRepo.findInstantiation.mockResolvedValue({
      projectId: 'prj_old',
      templateVersion: 1,
    })
    projects.retrieve.mockResolvedValue({
      data: { ...projectFixture, id: 'prj_old' },
      error: null,
    })
    const result = await service.instantiateTemplate('org_1', 'prjtpl_1', {
      name: 'New',
      startDate: START,
      idempotencyKey: 'key-1',
    })
    expect(result.error).toBeNull()
    expect(result.data?.project.id).toBe('prj_old')
    expect(result.data?.replayed).toBe(true)
    expect(templatesRepo.instantiateInTransaction).not.toHaveBeenCalled()
  })

  it('passes include flags through to the materialized plan', async () => {
    const result = await service.instantiateTemplate('org_1', 'prjtpl_1', {
      name: 'New',
      startDate: START,
      includeWorkItems: false,
    })
    expect(result.error).toBeNull()
    expect(capturedTransaction?.plan.workItems).toHaveLength(0)
    expect(capturedTransaction?.plan.phases).toHaveLength(1)
  })
})

describe('previewTemplate', () => {
  it('returns dated phases and work items without writing', async () => {
    const result = await service.previewTemplate('org_1', 'prjtpl_1', {
      startDate: START,
    })
    expect(result.error).toBeNull()
    expect(result.data?.object).toBe('projects.template-preview')
    expect(result.data?.phases[0]).toMatchObject({
      ref: 'phase-a',
      start: START,
    })
    expect(result.data?.workItems[0]).toMatchObject({
      ref: 'work-item-1',
      start: START + 86400,
      due: START + 3 * 86400,
    })
    expect(result.data?.missing).toEqual({
      workItemTypes: [],
      workflowStates: [],
      labels: [],
    })
    expect(templatesRepo.instantiateInTransaction).not.toHaveBeenCalled()
    expect(templatesRepo.findInstantiation).not.toHaveBeenCalled()
  })

  it('reports missing keys in the preview payload', async () => {
    const definition = definitionFixture()
    definition.workItems = [
      {
        ref: 'work-item-1',
        title: 'First',
        typeKey: 'ghost-type',
        stateKey: 'todo',
      },
    ]
    templatesRepo.retrieveTemplate.mockResolvedValue(
      templateRowFixture(definition),
    )
    const result = await service.previewTemplate('org_1', 'prjtpl_1', {
      startDate: START,
    })
    expect(result.error).toBeNull()
    expect(result.data?.missing.workItemTypes).toEqual(['ghost-type'])
    expect(templatesRepo.instantiateInTransaction).not.toHaveBeenCalled()
  })
})

describe('template versioning', () => {
  it('increments the version on PATCH', async () => {
    const result = await service.updateTemplate('org_1', 'prjtpl_1', {
      name: 'Renamed',
    })
    expect(result.error).toBeNull()
    expect(result.data?.currentVersion).toBe(2)
    expect(templatesRepo.updateTemplate).toHaveBeenCalledOnce()
    const call = templatesRepo.updateTemplate.mock.calls[0]
    expect(typeof call?.[2]?.versionId).toBe('string')
  })

  it('lists versions for a live template', async () => {
    templatesRepo.listTemplateVersions.mockResolvedValue([
      {
        id: 'prjtplv_2',
        tenantId: 'prjten_1',
        templateId: 'prjtpl_1',
        version: 2,
        definition: {},
        createdAt: 3000n,
      },
    ])
    const result = await service.listTemplateVersions('org_1', 'prjtpl_1')
    expect(result.error).toBeNull()
    expect(result.data?.[0]).toMatchObject({
      object: 'projects.project-template-version',
      version: 2,
    })
  })

  it('removes a template with a tombstone', async () => {
    const result = await service.removeTemplate('org_1', 'prjtpl_1')
    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.project-template',
      id: 'prjtpl_1',
      deleted: true,
    })
    expect(templatesRepo.softDeleteTemplate).toHaveBeenCalledOnce()
  })
})

describe('soft-deleted templates', () => {
  beforeEach(() => {
    templatesRepo.retrieveTemplate.mockResolvedValue(null)
  })

  it('cannot be retrieved', async () => {
    const result = await service.retrieveTemplate('org_1', 'prjtpl_1')
    expect(result.error?.code).toBe('projects/template-not-found')
  })

  it('cannot be instantiated', async () => {
    const result = await service.instantiateTemplate('org_1', 'prjtpl_1', {
      name: 'New',
      startDate: START,
    })
    expect(result.error?.code).toBe('projects/template-not-found')
    expect(templatesRepo.instantiateInTransaction).not.toHaveBeenCalled()
  })

  it('cannot be previewed', async () => {
    const result = await service.previewTemplate('org_1', 'prjtpl_1', {
      startDate: START,
    })
    expect(result.error?.code).toBe('projects/template-not-found')
  })
})

describe('tenant isolation', () => {
  it('scopes template reads to the requesting tenant', async () => {
    tenants.resolveTenant.mockResolvedValue({ id: 'prjten_other' })
    templatesRepo.retrieveTemplate.mockResolvedValue(null)
    const result = await service.retrieveTemplate('org_other', 'prjtpl_1')
    expect(templatesRepo.retrieveTemplate).toHaveBeenCalledWith(
      'prjten_other',
      'prjtpl_1',
    )
    expect(result.error?.code).toBe('projects/template-not-found')
  })

  it('scopes instantiation to the requesting tenant', async () => {
    tenants.resolveTenant.mockResolvedValue({ id: 'prjten_other' })
    templatesRepo.retrieveTemplate.mockResolvedValue(null)
    const result = await service.instantiateTemplate('org_other', 'prjtpl_1', {
      name: 'New',
      startDate: START,
    })
    expect(result.error?.code).toBe('projects/template-not-found')
    expect(templatesRepo.instantiateInTransaction).not.toHaveBeenCalled()
  })
})

describe('cloneProject', () => {
  const sourceProject = {
    id: 'prj_src',
    tenantId: 'prjten_1',
    key: 'SRC',
    name: 'Source',
    description: null,
    status: 'active',
    health: 'on-track',
    startDate: 1000000n,
    targetDate: null,
  }

  function issueFixture(
    id: string,
    identifier: string,
    parentIssueId: string | null,
    typeKey = 'task',
  ) {
    return {
      id,
      identifier,
      title: identifier,
      description: null,
      state: { key: 'todo' },
      status: 'todo',
      typeKey,
      priority: 'none',
      estimate: null,
      labels: [],
      milestone: null,
      taskListId: null,
      parentIssueId,
      plannedStartDate: null,
      plannedFinishDate: null,
      plannedDurationMinutes: null,
      dueDate: null,
      customFields: [],
    }
  }

  beforeEach(() => {
    projects.resolveProject.mockResolvedValue(sourceProject)
    workStructure.listWorkItemTypes.mockResolvedValue({
      data: [
        { id: 'wit_task', key: 'task', hierarchyLevel: 1 },
        { id: 'wit_sub', key: 'subtask', hierarchyLevel: 0 },
      ],
      error: null,
    })
    issues.list.mockResolvedValue({
      data: {
        items: [
          issueFixture('iss_1', 'SRC-1', null, 'task'),
          issueFixture('iss_2', 'SRC-2', 'iss_1', 'subtask'),
        ],
        hasMore: false,
        totalCount: 2,
      },
      error: null,
    })
    issues.listDependenciesForIssueIds.mockResolvedValue([
      {
        predecessorIssueId: 'iss_1',
        successorIssueId: 'iss_2',
        type: 'finish-to-start',
        lagMinutes: 0,
      },
    ])
  })

  it('materializes the same dependency graph shape', async () => {
    const result = await service.cloneProject('org_1', 'prj_src', {
      name: 'Copy',
    })
    expect(result.error).toBeNull()
    expect(result.data?.project.id).toBe('prj_new')
    expect(templatesRepo.instantiateInTransaction).toHaveBeenCalledOnce()
    expect(capturedTransaction?.plan.workItems).toHaveLength(2)
    expect(capturedTransaction?.plan.dependencies).toHaveLength(1)
    const link = capturedTransaction?.plan.dependencies[0]
    const refs = capturedTransaction?.plan.workItems.map((item) => item.ref)
    expect(refs?.[link?.fromPlanIndex as number]).toBe('work-item-1')
    expect(refs?.[link?.toPlanIndex as number]).toBe('work-item-2')
    expect(capturedTransaction?.plan.workItems[1]?.parentPlanIndex).toBe(0)
  })

  it('returns project-not-found for an unknown source', async () => {
    projects.resolveProject.mockResolvedValue(null)
    const result = await service.cloneProject('org_1', 'prj_missing', {
      name: 'Copy',
    })
    expect(result.error?.code).toBe('projects/project-not-found')
    expect(templatesRepo.instantiateInTransaction).not.toHaveBeenCalled()
  })
})

describe('saveAsTemplate', () => {
  beforeEach(() => {
    projects.resolveProject.mockResolvedValue({
      id: 'prj_src',
      tenantId: 'prjten_1',
      key: 'SRC',
      name: 'Source',
      description: 'Source description',
      status: 'active',
      health: 'on-track',
      startDate: 1000000n,
      targetDate: null,
    })
  })

  it('captures the live project into a new template', async () => {
    const result = await service.saveAsTemplate('org_1', 'prj_src', {
      key: 'src-pack',
    })
    expect(result.error).toBeNull()
    expect(result.data?.object).toBe('projects.project-template')
    expect(result.data?.key).toBe('src-pack')
    expect(templatesRepo.createTemplate).toHaveBeenCalledOnce()
    const params = templatesRepo.createTemplate.mock.calls[0]?.[0] as {
      sourceProjectId: string
      definition: { schemaVersion: number }
    }
    expect(params.sourceProjectId).toBe('prj_src')
    expect(params.definition.schemaVersion).toBe(1)
  })

  it('rejects a taken template key without capturing', async () => {
    templatesRepo.retrieveTemplateByKey.mockResolvedValue(
      templateRowFixture(definitionFixture()),
    )
    const result = await service.saveAsTemplate('org_1', 'prj_src', {
      key: 'sprint-pack',
    })
    expect(result.error?.code).toBe('projects/template-key-taken')
    expect(templatesRepo.createTemplate).not.toHaveBeenCalled()
  })
})

describe('createTemplate', () => {
  it('rejects a taken template key', async () => {
    templatesRepo.retrieveTemplateByKey.mockResolvedValue(
      templateRowFixture(definitionFixture()),
    )
    const result = await service.createTemplate('org_1', {
      key: 'sprint-pack',
      name: 'Sprint pack',
      definition: definitionFixture(),
    })
    expect(result.error?.code).toBe('projects/template-key-taken')
  })

  it('rejects a malformed template key', async () => {
    const result = await service.createTemplate('org_1', {
      key: 'Not Kebab!',
      name: 'Sprint pack',
      definition: definitionFixture(),
    })
    expect(result.error?.code).toBe('projects/invalid-template-key')
  })
})
