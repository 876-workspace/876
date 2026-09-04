import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repository, tenants, projects, issues } = vi.hoisted(() => ({
  repository: {
    listWorkItemTypes: vi.fn(),
    retrieveWorkItemType: vi.fn(),
    retrieveWorkItemTypeByKey: vi.fn(),
    createWorkItemType: vi.fn(),
    updateWorkItemType: vi.fn(),
    clearDefaultWorkItemType: vi.fn(),
    archiveWorkItemType: vi.fn(),
    countIssuesForWorkItemType: vi.fn(),
    listWorkflowStates: vi.fn(),
    retrieveWorkflowState: vi.fn(),
    retrieveWorkflowStateByKey: vi.fn(),
    createWorkflowState: vi.fn(),
    updateWorkflowState: vi.fn(),
    clearDefaultWorkflowState: vi.fn(),
    archiveWorkflowState: vi.fn(),
    countActiveWorkflowStates: vi.fn(),
    countIssuesForWorkflowState: vi.fn(),
    listMilestones: vi.fn(),
    retrieveMilestone: vi.fn(),
    retrieveMilestoneByKey: vi.fn(),
    createMilestone: vi.fn(),
    updateMilestone: vi.fn(),
    deleteMilestone: vi.fn(),
    listCustomFields: vi.fn(),
    retrieveCustomField: vi.fn(),
    retrieveCustomFieldByKey: vi.fn(),
    createCustomField: vi.fn(),
    updateCustomField: vi.fn(),
    archiveCustomField: vi.fn(),
    listCustomFieldValues: vi.fn(),
    upsertCustomFieldValue: vi.fn(),
    clearCustomFieldValue: vi.fn(),
    seedMissing: vi.fn(),
    seedPreset: vi.fn(),
  },
  tenants: { resolveTenant: vi.fn(), setPresetKey: vi.fn() },
  projects: { resolveProject: vi.fn() },
  issues: { resolveIssue: vi.fn() },
}))

vi.mock('../work-structure.repository.js', () => repository)
vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../../projects/index.js', () => projects)
vi.mock('../../issues/index.js', () => issues)

const { createWorkStructureRouter, createCustomFieldValuesRouter } =
  await import('../work-structure.routes.js')

const SECOND = 1787767200n

const tenant = { id: 'prjten_1', organizationId: 'org_1' }
const project = { id: 'prj_1', tenantId: tenant.id, key: 'CONSOLE' }

const typeRow = {
  id: 'wit_task_1',
  tenantId: tenant.id,
  key: 'task',
  name: 'Task',
  iconKey: 'check-square',
  color: '#2563eb',
  hierarchyLevel: 1,
  description: null,
  isDefault: true,
  position: 1,
  archivedAt: null,
  createdAt: SECOND,
  updatedAt: SECOND,
}

const stateRow = {
  id: 'wfs_todo_1',
  tenantId: tenant.id,
  key: 'todo',
  name: 'To do',
  category: 'unstarted',
  color: '#64748b',
  description: null,
  isDefault: false,
  position: 1,
  archivedAt: null,
  createdAt: SECOND,
  updatedAt: SECOND,
}

const milestoneRow = {
  id: 'ms_1',
  tenantId: tenant.id,
  projectId: project.id,
  key: 'v1',
  name: 'Version 1',
  description: null,
  status: 'open',
  startDate: SECOND,
  targetDate: SECOND + 100000n,
  completedAt: null,
  position: 0,
  deletedAt: null,
  createdAt: SECOND,
  updatedAt: SECOND,
}

const fieldRow = {
  id: 'cf_1',
  tenantId: tenant.id,
  key: 'severity',
  label: 'Severity',
  fieldType: 'select',
  options: [{ key: 'high', label: 'High' }],
  required: false,
  description: null,
  position: 0,
  archivedAt: null,
  createdAt: SECOND,
  updatedAt: SECOND,
  types: [],
}

async function requestJson(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId', createWorkStructureRouter())
  app.use(
    '/v1/organizations/:organizationId/issues/:issueRef/custom-field-values',
    createCustomFieldValuesRouter()
  )
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No port')

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-internal-key': 'test-internal-key',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: response.status, body: await response.json() }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

const ORG = '/v1/organizations/org_1'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  tenants.resolveTenant.mockResolvedValue(tenant)
  tenants.setPresetKey.mockResolvedValue(undefined)
  projects.resolveProject.mockResolvedValue(project)
  issues.resolveIssue.mockResolvedValue({ id: 'iss_1', deletedAt: null })
  repository.listWorkItemTypes.mockResolvedValue([])
  repository.retrieveWorkItemType.mockResolvedValue(null)
  repository.retrieveWorkItemTypeByKey.mockResolvedValue(null)
  repository.createWorkItemType.mockImplementation(async (data) => ({
    description: null,
    archivedAt: null,
    position: 0,
    isDefault: false,
    hierarchyLevel: 1,
    ...data,
  }))
  repository.updateWorkItemType.mockImplementation(async (_t, _id, patch) => ({
    ...typeRow,
    ...patch,
  }))
  repository.countIssuesForWorkItemType.mockResolvedValue(0)
  repository.listWorkflowStates.mockResolvedValue([])
  repository.retrieveWorkflowState.mockResolvedValue(null)
  repository.retrieveWorkflowStateByKey.mockResolvedValue(null)
  repository.createWorkflowState.mockImplementation(async (data) => ({
    description: null,
    archivedAt: null,
    position: 0,
    isDefault: false,
    ...data,
  }))
  repository.updateWorkflowState.mockImplementation(async (_t, _id, patch) => ({
    ...stateRow,
    ...patch,
  }))
  repository.countActiveWorkflowStates.mockResolvedValue(3)
  repository.countIssuesForWorkflowState.mockResolvedValue(0)
  repository.listMilestones.mockResolvedValue([])
  repository.retrieveMilestone.mockResolvedValue(null)
  repository.retrieveMilestoneByKey.mockResolvedValue(null)
  repository.createMilestone.mockImplementation(async (data) => ({
    description: null,
    status: 'open',
    startDate: null,
    targetDate: null,
    completedAt: null,
    position: 0,
    deletedAt: null,
    ...data,
  }))
  repository.updateMilestone.mockImplementation(async (_t, _id, patch) => ({
    ...milestoneRow,
    ...patch,
  }))
  repository.listCustomFields.mockResolvedValue([])
  repository.retrieveCustomField.mockResolvedValue(null)
  repository.retrieveCustomFieldByKey.mockResolvedValue(null)
  repository.createCustomField.mockImplementation(async (data) => ({
    options: undefined,
    required: false,
    description: null,
    position: 0,
    archivedAt: null,
    types: [],
    ...data,
  }))
  repository.updateCustomField.mockImplementation(async (_t, _id, patch) => ({
    ...fieldRow,
    ...patch,
  }))
  repository.listCustomFieldValues.mockResolvedValue([])
  repository.upsertCustomFieldValue.mockImplementation(async (data) => ({
    ...data,
    field: await repository.retrieveCustomField(data.tenantId, data.fieldId),
  }))
  repository.seedMissing.mockResolvedValue(undefined)
  repository.seedPreset.mockResolvedValue(undefined)
})

describe('work-structure auth', () => {
  it('rejects a types listing without the internal key', async () => {
    const { status } = await requestJson(
      'GET',
      `${ORG}/work-item-types`,
      undefined,
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
  })

  it('rejects a type creation without the internal key', async () => {
    const { status } = await requestJson(
      'POST',
      `${ORG}/work-item-types`,
      { key: 'bug', name: 'Bug', iconKey: 'bug', color: '#dc2626' },
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(repository.createWorkItemType).not.toHaveBeenCalled()
  })

  it('rejects a preset apply without the internal key', async () => {
    const { status } = await requestJson(
      'POST',
      `${ORG}/presets/apply`,
      { key: 'general' },
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
  })
})

describe('work-item-type routes', () => {
  it('lists types as a platform list envelope', async () => {
    repository.listWorkItemTypes.mockResolvedValue([typeRow])

    const { status, body } = await requestJson('GET', `${ORG}/work-item-types`)

    expect(status).toBe(200)
    expect(body.data.object).toBe('list')
    expect(body.data.data[0]).toMatchObject({
      object: 'projects.work-item-type',
      key: 'task',
    })
    expect(body.error).toBeNull()
  })

  it('creates a type with a 201 status', async () => {
    const { status, body } = await requestJson(
      'POST',
      `${ORG}/work-item-types`,
      {
        key: 'bug',
        name: 'Bug',
        iconKey: 'bug',
        color: '#dc2626',
      }
    )

    expect(status).toBe(201)
    expect(body.data.key).toBe('bug')
    expect(body.data.id.startsWith('wit_')).toBe(true)
  })

  it('maps a duplicate key to a 409 conflict', async () => {
    repository.retrieveWorkItemTypeByKey.mockResolvedValue(typeRow)

    const { status, body } = await requestJson(
      'POST',
      `${ORG}/work-item-types`,
      {
        key: 'task',
        name: 'Task',
        iconKey: 'check-square',
        color: '#2563eb',
      }
    )

    expect(status).toBe(409)
    expect(body.data).toBeNull()
    expect(body.error.code).toBe('projects/work-item-type-key-taken')
  })

  it('retrieves a type by id', async () => {
    repository.retrieveWorkItemType.mockResolvedValue(typeRow)

    const { status, body } = await requestJson(
      'GET',
      `${ORG}/work-item-types/wit_task_1`
    )

    expect(status).toBe(200)
    expect(body.data.id).toBe('wit_task_1')
  })

  it('maps an unknown type id to a 404', async () => {
    const { status, body } = await requestJson(
      'GET',
      `${ORG}/work-item-types/wit_missing`
    )

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/work-item-type-not-found')
  })

  it('updates a type name', async () => {
    repository.retrieveWorkItemType.mockResolvedValue(typeRow)

    const { status, body } = await requestJson(
      'PATCH',
      `${ORG}/work-item-types/wit_task_1`,
      { name: 'Chore' }
    )

    expect(status).toBe(200)
    expect(body.data.name).toBe('Chore')
  })

  it('deletes an unused type', async () => {
    repository.retrieveWorkItemType.mockResolvedValue(typeRow)

    const { status, body } = await requestJson(
      'DELETE',
      `${ORG}/work-item-types/wit_task_1`
    )

    expect(status).toBe(200)
    expect(body.data).toEqual({
      object: 'projects.work-item-type',
      id: 'wit_task_1',
      deleted: true,
    })
  })

  it('maps an in-use type delete to a 409 conflict', async () => {
    repository.retrieveWorkItemType.mockResolvedValue(typeRow)
    repository.countIssuesForWorkItemType.mockResolvedValue(1)

    const { status, body } = await requestJson(
      'DELETE',
      `${ORG}/work-item-types/wit_task_1`
    )

    expect(status).toBe(409)
    expect(body.error.code).toBe('projects/work-item-type-in-use')
  })
})

describe('workflow-state routes', () => {
  it('lists states with their categories', async () => {
    repository.listWorkflowStates.mockResolvedValue([stateRow])

    const { status, body } = await requestJson('GET', `${ORG}/workflow-states`)

    expect(status).toBe(200)
    expect(body.data.data[0]).toMatchObject({
      object: 'projects.workflow-state',
      category: 'unstarted',
    })
  })

  it('creates a state with a 201 status', async () => {
    const { status, body } = await requestJson(
      'POST',
      `${ORG}/workflow-states`,
      {
        key: 'in-review',
        name: 'In review',
        category: 'started',
        color: '#d97706',
      }
    )

    expect(status).toBe(201)
    expect(body.data.id.startsWith('wfs_')).toBe(true)
  })

  it('maps a duplicate state key to a 409 conflict', async () => {
    repository.retrieveWorkflowStateByKey.mockResolvedValue(stateRow)

    const { status, body } = await requestJson(
      'POST',
      `${ORG}/workflow-states`,
      {
        key: 'todo',
        name: 'To do',
        category: 'unstarted',
        color: '#64748b',
      }
    )

    expect(status).toBe(409)
    expect(body.error.code).toBe('projects/workflow-state-key-taken')
  })

  it('maps an unknown state id to a 404', async () => {
    const { status, body } = await requestJson(
      'GET',
      `${ORG}/workflow-states/wfs_missing`
    )

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/workflow-state-not-found')
  })

  it('protects the default state from deletion', async () => {
    repository.retrieveWorkflowState.mockResolvedValue({
      ...stateRow,
      isDefault: true,
    })

    const { status, body } = await requestJson(
      'DELETE',
      `${ORG}/workflow-states/wfs_todo_1`
    )

    expect(status).toBe(409)
    expect(body.error.code).toBe('projects/default-workflow-state-required')
  })

  it('deletes a replaceable state', async () => {
    repository.retrieveWorkflowState.mockResolvedValue(stateRow)

    const { status, body } = await requestJson(
      'DELETE',
      `${ORG}/workflow-states/wfs_todo_1`
    )

    expect(status).toBe(200)
    expect(body.data.deleted).toBe(true)
  })
})

describe('milestone routes', () => {
  it('lists milestones for the requested project', async () => {
    repository.listMilestones.mockResolvedValue([milestoneRow])

    const { status, body } = await requestJson(
      'GET',
      `${ORG}/milestones?projectId=prj_1`
    )

    expect(status).toBe(200)
    expect(body.data.data[0]).toMatchObject({
      object: 'projects.milestone',
      key: 'v1',
    })
  })

  it('creates a milestone with a 201 status', async () => {
    const { status, body } = await requestJson('POST', `${ORG}/milestones`, {
      projectId: 'prj_1',
      key: 'v2',
      name: 'Version 2',
    })

    expect(status).toBe(201)
    expect(body.data.id.startsWith('ms_')).toBe(true)
  })

  it('maps a duplicate milestone key to a 409 conflict', async () => {
    repository.retrieveMilestoneByKey.mockResolvedValue(milestoneRow)

    const { status, body } = await requestJson('POST', `${ORG}/milestones`, {
      projectId: 'prj_1',
      key: 'v1',
      name: 'Version 1 again',
    })

    expect(status).toBe(409)
    expect(body.error.code).toBe('projects/milestone-key-taken')
  })

  it('maps an unknown milestone id to a 404', async () => {
    const { status, body } = await requestJson(
      'GET',
      `${ORG}/milestones/ms_missing`
    )

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/milestone-not-found')
  })

  it('completes a milestone with a stamped completion second', async () => {
    repository.retrieveMilestone.mockResolvedValue(milestoneRow)

    const { status, body } = await requestJson(
      'PATCH',
      `${ORG}/milestones/ms_1`,
      {
        status: 'completed',
      }
    )

    expect(status).toBe(200)
    expect(typeof body.data.completedAt).toBe('number')
  })

  it('deletes a milestone', async () => {
    repository.retrieveMilestone.mockResolvedValue(milestoneRow)

    const { status, body } = await requestJson(
      'DELETE',
      `${ORG}/milestones/ms_1`
    )

    expect(status).toBe(200)
    expect(body.data.deleted).toBe(true)
  })
})

describe('custom-field routes', () => {
  it('lists fields as a platform list envelope', async () => {
    repository.listCustomFields.mockResolvedValue([fieldRow])

    const { status, body } = await requestJson('GET', `${ORG}/custom-fields`)

    expect(status).toBe(200)
    expect(body.data.data[0]).toMatchObject({
      object: 'projects.custom-field',
      key: 'severity',
    })
  })

  it('creates a field with a 201 status', async () => {
    const { status, body } = await requestJson('POST', `${ORG}/custom-fields`, {
      key: 'impact',
      label: 'Impact',
      fieldType: 'number',
    })

    expect(status).toBe(201)
    expect(body.data.id.startsWith('cf_')).toBe(true)
  })

  it('maps a duplicate field key to a 409 conflict', async () => {
    repository.retrieveCustomFieldByKey.mockResolvedValue(fieldRow)

    const { status, body } = await requestJson('POST', `${ORG}/custom-fields`, {
      key: 'severity',
      label: 'Severity',
      fieldType: 'select',
    })

    expect(status).toBe(409)
    expect(body.error.code).toBe('projects/custom-field-key-taken')
  })

  it('maps an unknown field id to a 404', async () => {
    const { status, body } = await requestJson(
      'GET',
      `${ORG}/custom-fields/cf_missing`
    )

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/custom-field-not-found')
  })

  it('deletes a field', async () => {
    repository.retrieveCustomField.mockResolvedValue(fieldRow)

    const { status, body } = await requestJson(
      'DELETE',
      `${ORG}/custom-fields/cf_1`
    )

    expect(status).toBe(200)
    expect(body.data.deleted).toBe(true)
  })
})

describe('preset routes', () => {
  it('lists the three catalog presets', async () => {
    const { status, body } = await requestJson('GET', `${ORG}/presets`)

    expect(status).toBe(200)
    expect(body.data.map((preset: { key: string }) => preset.key)).toEqual([
      'software-development',
      'business-operations',
      'general',
    ])
  })

  it('applies a preset and records it on the tenant', async () => {
    const { status, body } = await requestJson('POST', `${ORG}/presets/apply`, {
      key: 'general',
    })

    expect(status).toBe(200)
    expect(body.error).toBeNull()
    expect(repository.seedPreset).toHaveBeenCalled()
    expect(tenants.setPresetKey).toHaveBeenCalledWith(tenant.id, 'general')
  })
})

describe('custom-field-value routes', () => {
  const VALUES = `${ORG}/issues/CONSOLE-12/custom-field-values`

  it('lists the values stored on an issue', async () => {
    repository.listCustomFieldValues.mockResolvedValue([])

    const { status, body } = await requestJson('GET', VALUES)

    expect(status).toBe(200)
    expect(body.data.object).toBe('list')
    expect(body.data.data).toEqual([])
  })

  it('maps a deleted issue to a 404 on value listing', async () => {
    issues.resolveIssue.mockResolvedValue({ id: 'iss_1', deletedAt: 1n })

    const { status, body } = await requestJson('GET', VALUES)

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/issue-not-found')
  })

  it('stores a select value through PUT', async () => {
    repository.retrieveCustomField.mockResolvedValue(fieldRow)

    const { status, body } = await requestJson('PUT', VALUES, {
      fieldId: 'cf_1',
      value: 'high',
    })

    expect(status).toBe(200)
    expect(body.data.value).toBe('high')
    expect(body.data.fieldKey).toBe('severity')
  })

  it('maps an unknown field to a 404 on PUT', async () => {
    const { status, body } = await requestJson('PUT', VALUES, {
      fieldId: 'cf_missing',
      value: 'high',
    })

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/custom-field-not-found')
  })

  it('clears a value through DELETE', async () => {
    repository.retrieveCustomField.mockResolvedValue(fieldRow)

    const { status, body } = await requestJson('DELETE', `${VALUES}/cf_1`)

    expect(status).toBe(200)
    expect(body.data.deleted).toBe(true)
    expect(repository.clearCustomFieldValue).toHaveBeenCalledWith(
      tenant.id,
      'iss_1',
      'cf_1'
    )
  })
})
