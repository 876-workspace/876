import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  createWorkItemType: vi.fn(),
  updateWorkItemType: vi.fn(),
  deleteWorkItemType: vi.fn(),
  createWorkflowState: vi.fn(),
  createMilestone: vi.fn(),
  createCustomField: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiPermission: mocks.requirePermission,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: {
    workItemTypes: {
      create: mocks.createWorkItemType,
      update: mocks.updateWorkItemType,
      delete: mocks.deleteWorkItemType,
    },
    workflowStates: { create: mocks.createWorkflowState },
    milestones: { create: mocks.createMilestone },
    customFields: { create: mocks.createCustomField },
  },
}))

const { POST: createWorkItemType } = await import('./work-item-types/route')
const { PATCH: updateWorkItemType, DELETE: deleteWorkItemType } =
  await import('./work-item-types/[id]/route')
const { POST: createWorkflowState } = await import('./workflow-states/route')
const { POST: createMilestone } = await import('./milestones/route')
const { POST: createCustomField } = await import('./custom-fields/route')

function request(url: string, method: string, body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers:
      body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requirePermission.mockResolvedValue({ response: null, orgId: 'org_1' })
  for (const mock of [
    mocks.createWorkItemType,
    mocks.updateWorkItemType,
    mocks.createWorkflowState,
    mocks.createMilestone,
    mocks.createCustomField,
  ]) {
    mock.mockResolvedValue({ data: { id: 'resource_1' }, error: null })
  }
  mocks.deleteWorkItemType.mockResolvedValue({
    data: { id: 'resource_1', deleted: true },
    error: null,
  })
})

describe('work-structure host routes', () => {
  it.each([
    [
      'work item type',
      createWorkItemType,
      '/api/work-item-types',
      { key: 'bug', name: 'Bug', iconKey: 'bug', color: '#ef4444' },
      mocks.createWorkItemType,
    ],
    [
      'workflow state',
      createWorkflowState,
      '/api/workflow-states',
      { key: 'triage', name: 'Triage', category: 'backlog', color: '#6b7280' },
      mocks.createWorkflowState,
    ],
    [
      'milestone',
      createMilestone,
      '/api/milestones',
      { projectId: 'project_1', key: 'v1', name: 'Version 1' },
      mocks.createMilestone,
    ],
    [
      'custom field',
      createCustomField,
      '/api/custom-fields',
      { key: 'customer', label: 'Customer', fieldType: 'text' },
      mocks.createCustomField,
    ],
  ])(
    'creates a %s through settings.edit',
    async (_name, route, url, body, service) => {
      const response = await route(request(url, 'POST', body))

      expect(response.status).toBe(201)
      expect(mocks.requirePermission).toHaveBeenCalledWith('settings.edit')
      expect(service).toHaveBeenCalledWith('org_1', body)
    }
  )

  it.each([
    [
      'work item type',
      createWorkItemType,
      '/api/work-item-types',
      mocks.createWorkItemType,
    ],
    [
      'workflow state',
      createWorkflowState,
      '/api/workflow-states',
      mocks.createWorkflowState,
    ],
    ['milestone', createMilestone, '/api/milestones', mocks.createMilestone],
    [
      'custom field',
      createCustomField,
      '/api/custom-fields',
      mocks.createCustomField,
    ],
  ])(
    'rejects unknown %s input before the service call',
    async (_name, route, url, service) => {
      const response = await route(request(url, 'POST', { unknown: true }))

      expect(response.status).toBe(422)
      expect(service).not.toHaveBeenCalled()
    }
  )

  it('short-circuits update and delete when settings access is denied', async () => {
    mocks.requirePermission.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })
    const context = { params: Promise.resolve({ id: 'type_1' }) }

    expect(
      await updateWorkItemType(
        request('/api/work-item-types/type_1', 'PATCH', { name: 'Bug' }),
        context
      )
    ).toHaveProperty('status', 403)
    expect(
      await deleteWorkItemType(
        request('/api/work-item-types/type_1', 'DELETE'),
        context
      )
    ).toHaveProperty('status', 403)
    expect(mocks.updateWorkItemType).not.toHaveBeenCalled()
    expect(mocks.deleteWorkItemType).not.toHaveBeenCalled()
  })
})
