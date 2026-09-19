import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { create876ProjectsClient } from './client'
import { create876ProjectsOperatorClient } from './operator'
import { buildRuntime } from './runtime'
import { create876ProjectsServiceClient } from './service-client'

describe('client / runtime', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.PROJECTS_API_URL
    delete process.env.PROJECTS_URL
    delete process.env.NEXT_PUBLIC_PROJECTS_API_URL
    delete process.env.NEXT_PUBLIC_PROJECTS_URL
    delete process.env.PROJECTS_INTERNAL_KEY
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('create876ProjectsClient exposes all resource namespaces', () => {
    const client = create876ProjectsClient({
      baseUrl: 'http://test.api',
      internalKey: 'key_1',
    })
    expect(Object.keys(client).sort()).toEqual([
      'activity',
      'automationRules',
      'baselines',
      'budgets',
      'calendar',
      'capacity',
      'captures',
      'clientGrants',
      'comments',
      'customFieldValues',
      'customFields',
      'customModules',
      'cycles',
      'developmentLinks',
      'discussions',
      'events',
      'followers',
      'gantt',
      'issueDependencies',
      'issueRelations',
      'issues',
      'labels',
      'layouts',
      'milestones',
      'myWork',
      'notifications',
      'presets',
      'projectBilling',
      'projectCustomFields',
      'projectTemplates',
      'projects',
      'rates',
      'reminders',
      'reports',
      'taskLists',
      'tenants',
      'timeEntries',
      'timesheets',
      'wiki',
      'workItemTypes',
      'workflowStates',
      'workflows',
    ])
  })

  it('exposes the workflow automation namespaces', () => {
    const client = create876ProjectsClient({
      baseUrl: 'http://test.api',
      internalKey: 'key_1',
    })
    expect(Object.keys(client.workflows).sort()).toEqual([
      'getBlueprint',
      'putBlueprint',
    ])
    expect(Object.keys(client.automationRules).sort()).toEqual([
      'create',
      'list',
      'listRuns',
      'remove',
      'retrieve',
      'test',
      'update',
    ])
    expect(Object.keys(client.notifications).sort()).toEqual([
      'list',
      'markRead',
    ])
  })

  it('the runtime falls back to PROJECTS_API_URL when baseUrl is absent', () => {
    process.env.PROJECTS_API_URL = 'http://env-api.test'
    const runtime = buildRuntime({})
    expect(runtime.baseUrl).toBe('http://env-api.test')
  })

  it('the runtime falls back to PROJECTS_INTERNAL_KEY when internalKey is absent', () => {
    process.env.PROJECTS_INTERNAL_KEY = 'env-internal-key'
    const runtime = buildRuntime({})
    expect(runtime.internalKey).toBe('env-internal-key')
  })

  it('an explicit baseUrl overrides the environment variable', () => {
    process.env.PROJECTS_API_URL = 'http://env-api.test'
    const runtime = buildRuntime({ baseUrl: 'http://explicit-api.test/' })
    expect(runtime.baseUrl).toBe('http://explicit-api.test')
  })

  it('the runtime falls back to localhost:4030 when both baseUrl and env are absent', () => {
    const runtime = buildRuntime({})
    expect(runtime.baseUrl).toBe('http://localhost:4030')
  })

  it('the request sends x-internal-key with the resolved key', async () => {
    const mockFetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            object: 'projects.tenant',
            id: 'ten_1',
            organizationId: 'org_1',
            triageProjectId: null,
            createdAt: 100,
            updatedAt: 100,
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const client = create876ProjectsClient({
      baseUrl: 'http://projects.test',
      internalKey: 'test-internal-key',
      requestId: 'req_xyz',
      fetch: mockFetch,
    })

    const result = await client.tenants.retrieve('org_1')
    expect(result.data).toEqual({
      object: 'projects.tenant',
      id: 'ten_1',
      organizationId: 'org_1',
      triageProjectId: null,
      createdAt: 100,
      updatedAt: 100,
    })
    expect(result.error).toBeNull()

    expect(mockFetch).toHaveBeenCalledWith(
      'http://projects.test/v1/tenants/org_1',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'test-internal-key',
          'x-request-id': 'req_xyz',
        },
      }
    )
  })

  it('gives the operator the service surface plus platform administration resources', () => {
    const operatorClient = create876ProjectsOperatorClient({
      baseUrl: 'http://test.api',
      internalKey: 'key_1',
    })
    const serviceClient = create876ProjectsServiceClient({
      baseUrl: 'http://test.api',
      internalKey: 'key_1',
    })

    const adminResources = [
      'importJobs',
      'integrationClients',
      'metrics',
      'webhookEndpoints',
    ]
    expect(Object.keys(operatorClient).sort()).toEqual(
      [...Object.keys(serviceClient), ...adminResources].sort()
    )
    for (const key of adminResources)
      expect(Object.keys(serviceClient)).not.toContain(key)
  })

  it('returns projects/not-configured when internalKey is missing', async () => {
    const client = create876ProjectsClient({
      baseUrl: 'http://projects.test',
    })
    const result = await client.tenants.retrieve('org_1')
    expect(result).toEqual({
      data: null,
      error: {
        code: 'projects/not-configured',
        message: 'The Projects client is not configured.',
      },
    })
  })

  it('tenants.ensure sends POST /v1/tenants/ensure with organizationId in body', async () => {
    const mockFetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            object: 'projects.tenant',
            id: 'ten_1',
            organizationId: 'org_99',
            triageProjectId: 'prj_triage',
            createdAt: 100,
            updatedAt: 100,
          },
          error: null,
        }),
        { status: 201, headers: { 'content-type': 'application/json' } }
      )
    )

    const client = create876ProjectsClient({
      baseUrl: 'http://projects.test',
      internalKey: 'key_1',
      fetch: mockFetch,
    })

    const result = await client.tenants.ensure('org_99')
    expect(result.data).toEqual({
      object: 'projects.tenant',
      id: 'ten_1',
      organizationId: 'org_99',
      triageProjectId: 'prj_triage',
      createdAt: 100,
      updatedAt: 100,
    })
    expect(result.error).toBeNull()

    expect(mockFetch).toHaveBeenCalledWith(
      'http://projects.test/v1/tenants/ensure',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'key_1',
        },
        body: JSON.stringify({ organizationId: 'org_99' }),
      }
    )
  })
})
