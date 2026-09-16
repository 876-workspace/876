import { Client } from '@modelcontextprotocol/client'
import { InMemoryTransport } from '@modelcontextprotocol/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  config,
  createClient,
  mockProject,
  mockTenant,
  mockWorkflowState,
} from './handlers.test-fixtures'
import { PROJECTS_SERVER_INSTRUCTIONS } from './instructions'
import { buildProjectsMcpServer } from './server'

describe('server', () => {
  const { client: operatorClient } = createClient()

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('builds server with instructions and registers all 37 tools', async () => {
    const server = buildProjectsMcpServer(config, operatorClient)
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)

    const client = new Client({ name: 'test-client', version: '1.0.0' })
    await client.connect(clientTransport)

    const toolsRes = await client.listTools()

    expect(client.getInstructions()).toBe(PROJECTS_SERVER_INSTRUCTIONS)
    expect(toolsRes.tools.length).toBe(37)
    expect(toolsRes.tools.map((tool) => tool.name).sort()).toEqual([
      'activity_list',
      'custom_modules_list',
      'custom_record_get',
      'custom_records_list',
      'cycle_get',
      'cycles_list',
      'issue_comment',
      'issue_comments',
      'issue_create',
      'issue_events',
      'issue_get',
      'issue_update',
      'issues_list',
      'label_create',
      'labels_list',
      'milestones_list',
      'phase_get',
      'phases_list',
      'project_create',
      'project_get',
      'project_update',
      'projects_list',
      'report_budget_variance',
      'report_health',
      'report_time',
      'report_work',
      'report_workload',
      'task_lists_list',
      'template_get',
      'templates_list',
      'time_entries_list',
      'time_entry_create',
      'time_summary',
      'wiki_page_get',
      'work_item_types_list',
      'workflow_states_list',
      'workspace_get',
    ])

    await client.close()
    await server.close()
  })

  it('advertises accurate annotations on each tool', async () => {
    const server = buildProjectsMcpServer(config, operatorClient)
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)

    const client = new Client({ name: 'test-client', version: '1.0.0' })
    await client.connect(clientTransport)

    const toolsRes = await client.listTools()
    const toolMap = new Map(toolsRes.tools.map((tool) => [tool.name, tool]))

    const readOnlyTools = [
      'workspace_get',
      'projects_list',
      'project_get',
      'issues_list',
      'issue_get',
      'issue_comments',
      'issue_events',
      'labels_list',
      'work_item_types_list',
      'workflow_states_list',
      'milestones_list',
      'phases_list',
      'phase_get',
      'cycles_list',
      'cycle_get',
      'task_lists_list',
      'time_entries_list',
      'time_summary',
      'report_work',
      'report_health',
      'report_time',
      'report_budget_variance',
      'report_workload',
      'templates_list',
      'template_get',
      'custom_modules_list',
      'custom_records_list',
      'custom_record_get',
      'activity_list',
      'wiki_page_get',
    ]

    for (const name of readOnlyTools) {
      const tool = toolMap.get(name)
      expect(tool, `tool ${name} should exist`).toBeDefined()
      expect(tool?.annotations?.readOnlyHint, `${name} readOnlyHint`).toBe(true)
      expect(tool?.annotations?.destructiveHint, `${name} destructiveHint`).toBe(false)
      expect(tool?.annotations?.idempotentHint, `${name} idempotentHint`).toBe(true)
      expect(tool?.annotations?.openWorldHint, `${name} openWorldHint`).toBe(false)
    }

    const creationTools = [
      'project_create',
      'issue_create',
      'issue_comment',
      'label_create',
      'time_entry_create',
    ]
    for (const name of creationTools) {
      const tool = toolMap.get(name)
      expect(tool, `tool ${name} should exist`).toBeDefined()
      expect(tool?.annotations?.readOnlyHint, `${name} readOnlyHint`).toBe(false)
      expect(tool?.annotations?.destructiveHint, `${name} destructiveHint`).toBe(false)
      expect(tool?.annotations?.idempotentHint, `${name} idempotentHint`).toBe(false)
      expect(tool?.annotations?.openWorldHint, `${name} openWorldHint`).toBe(false)
    }

    const updateTools = ['project_update', 'issue_update']
    for (const name of updateTools) {
      const tool = toolMap.get(name)
      expect(tool, `tool ${name} should exist`).toBeDefined()
      expect(tool?.annotations?.readOnlyHint, `${name} readOnlyHint`).toBe(false)
      expect(tool?.annotations?.destructiveHint, `${name} destructiveHint`).toBe(true)
      expect(tool?.annotations?.idempotentHint, `${name} idempotentHint`).toBe(false)
      expect(tool?.annotations?.openWorldHint, `${name} openWorldHint`).toBe(false)
    }

    await client.close()
    await server.close()
  })

  it('advertises outputSchema and inputSchema for every tool with rich metadata', async () => {
    const server = buildProjectsMcpServer(config, operatorClient)
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)

    const client = new Client({ name: 'test-client', version: '1.0.0' })
    await client.connect(clientTransport)

    const toolsRes = await client.listTools()

    expect(toolsRes.tools.length).toBe(37)
    expect(new Set(toolsRes.tools.map((tool) => tool.name)).size).toBe(37)

    for (const tool of toolsRes.tools) {
      expect(tool.inputSchema, `${tool.name} inputSchema`).toBeDefined()
      expect(tool.inputSchema.type, `${tool.name} inputSchema.type`).toBe('object')
      expect(tool.outputSchema, `${tool.name} outputSchema`).toBeDefined()
      expect(tool.outputSchema?.type, `${tool.name} outputSchema.type`).toBe('object')
      expect(
        tool.description?.trim().length,
        `${tool.name} description`
      ).toBeGreaterThan(40)

      const properties = (tool.inputSchema.properties ?? {}) as Record<
        string,
        Record<string, unknown>
      >
      const propNames = Object.keys(properties)
      expect(propNames).not.toContain('organizationId')
      expect(propNames).not.toContain('organization_id')
      expect(propNames).not.toContain('orgId')

      for (const [paramName, paramSchema] of Object.entries(properties)) {
        expect(paramName.length).toBeGreaterThan(0)
        expect(
          paramSchema.description,
          `${tool.name}.${paramName} description`
        ).toBeDefined()
        expect(String(paramSchema.description).trim().length).toBeGreaterThan(0)
      }

      for (const required of tool.inputSchema.required ?? []) {
        expect(propNames).toContain(required)
      }
    }

    const toolMap = new Map(toolsRes.tools.map((tool) => [tool.name, tool]))

    const issuesList = toolMap.get('issues_list')
    const issuesListProps = (issuesList?.inputSchema.properties ?? {}) as Record<
      string,
      Record<string, unknown>
    >
    expect(issuesListProps.status?.enum).toBeUndefined()
    expect(issuesListProps.status?.description).toContain(
      'configured workflow-state key'
    )
    expect(issuesListProps.status?.description).toContain('workflow_states_list')

    const issueCreate = toolMap.get('issue_create')
    const issueCreateProps = (issueCreate?.inputSchema.properties ?? {}) as Record<
      string,
      Record<string, unknown>
    >
    expect(issueCreateProps.priority?.enum).toEqual([
      'none',
      'low',
      'medium',
      'high',
      'urgent',
    ])

    for (const name of ['issue_create', 'issue_update']) {
      const tool = toolMap.get(name)
      const props = (tool?.inputSchema.properties ?? {}) as Record<
        string,
        Record<string, unknown>
      >
      expect(props.status?.enum).toBeUndefined()
      expect(props.typeKey?.type).toBe('string')
      expect(props.milestoneId).toBeDefined()
      expect(props.customFields?.type).toBe('array')
    }

    for (const name of ['project_create', 'project_update']) {
      const tool = toolMap.get(name)
      const props = (tool?.inputSchema.properties ?? {}) as Record<
        string,
        Record<string, unknown>
      >
      expect(props.defaultWorkItemTypeId).toBeDefined()
      expect(props.defaultWorkItemTypeId?.description).toContain(
        'work_item_types_list'
      )
    }

    const workItemTypes = toolMap.get('work_item_types_list')
    const workflowStates = toolMap.get('workflow_states_list')
    const milestones = toolMap.get('milestones_list')
    expect(workItemTypes?.inputSchema.properties).toEqual({})
    expect(workflowStates?.inputSchema.properties).toEqual({})
    expect(milestones?.inputSchema.required).toEqual(['projectId'])

    const issueComments = toolMap.get('issue_comments')
    expect(issueComments?.inputSchema.required).toEqual(['issue'])
    expect(issueComments?.description).toContain('oldest first')

    const issueGet = toolMap.get('issue_get')
    const issueGetProps = (issueGet?.inputSchema.properties ?? {}) as Record<
      string,
      Record<string, unknown>
    >
    expect(issueGet?.inputSchema.required).toEqual(['issue'])
    expect(issueGetProps.includeComments?.type).toBe('boolean')
    expect(issueGet?.description).toContain('configured workflow state')
    expect(issueGet?.description).toContain('custom-field values')

    await client.close()
    await server.close()
  })

  it('returns structured content alongside text for registered tools', async () => {
    vi.spyOn(operatorClient.tenants, 'retrieve').mockResolvedValue({
      data: mockTenant,
      error: null,
    })
    vi.spyOn(operatorClient.projects, 'list').mockResolvedValue({
      data: {
        object: 'list',
        data: [mockProject],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_test_123/projects',
      },
      error: null,
    })
    vi.spyOn(operatorClient.workflowStates, 'list').mockResolvedValue({
      data: {
        object: 'list',
        data: [mockWorkflowState],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_test_123/workflow-states',
      },
      error: null,
    })
    vi.spyOn(operatorClient.issues, 'list').mockResolvedValue({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/v1/organizations/org_test_123/issues',
      },
      error: null,
    })

    const server = buildProjectsMcpServer(config, operatorClient)
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    const client = new Client({ name: 'test-client', version: '1.0.0' })
    await client.connect(clientTransport)

    const result = await client.callTool({
      name: 'workspace_get',
      arguments: {},
    })

    expect(result.isError).toBeFalsy()
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('Tenant: org_test_123'),
    })
    expect(result.structuredContent).toEqual({
      tenant: mockTenant,
      projects: [{ project: mockProject, openIssueCount: 0 }],
    })

    await client.close()
    await server.close()
  })

  it('returns expected application errors without structured success data', async () => {
    vi.spyOn(operatorClient.issues, 'retrieve').mockResolvedValue({
      data: null,
      error: {
        code: 'projects/issue-not-found',
        message: 'Issue not found: NOTFOUND-99',
      },
    })

    const server = buildProjectsMcpServer(config, operatorClient)
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    const client = new Client({ name: 'test-client', version: '1.0.0' })
    await client.connect(clientTransport)

    const result = await client.callTool({
      name: 'issue_get',
      arguments: { issue: 'NOTFOUND-99' },
    })

    expect(result.isError).toBe(true)
    expect(result.structuredContent).toBeUndefined()
    expect(result.content[0]).toEqual({
      type: 'text',
      text: 'Error [projects/issue-not-found]: Issue not found: NOTFOUND-99',
    })

    await client.close()
    await server.close()
  })

  it('masks unexpected exceptions from MCP clients', async () => {
    const privateDetail = 'database password appeared in an exception'
    vi.spyOn(operatorClient.projects, 'list').mockRejectedValue(
      new Error(privateDetail)
    )
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const server = buildProjectsMcpServer(config, operatorClient)
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    const client = new Client({ name: 'test-client', version: '1.0.0' })
    await client.connect(clientTransport)

    const result = await client.callTool({
      name: 'projects_list',
      arguments: {},
    })

    expect(result.isError).toBe(true)
    expect(result.structuredContent).toBeUndefined()
    expect(result.content[0]).toEqual({
      type: 'text',
      text: 'Error [internal/tool-error]: The Projects MCP tool failed unexpectedly. Check the server logs for details.',
    })
    expect(JSON.stringify(result)).not.toContain(privateDetail)
    expect(errorSpy).toHaveBeenCalledWith(
      '876 Projects MCP unexpected tool error:',
      privateDetail
    )

    await client.close()
    await server.close()
  })
})
