import { Client } from '@modelcontextprotocol/client'
import { InMemoryTransport } from '@modelcontextprotocol/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  config,
  createClient,
  mockComment,
  mockIssue,
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

  it('builds server with instructions and registers all 17 tools', async () => {
    const server = buildProjectsMcpServer(config, operatorClient)
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)

    const client = new Client({ name: 'test-client', version: '1.0.0' })
    await client.connect(clientTransport)

    expect(client.getInstructions()).toBe(PROJECTS_SERVER_INSTRUCTIONS)

    const toolsRes = await client.listTools()
    expect(toolsRes.tools.length).toBe(17)

    const names = toolsRes.tools.map((t) => t.name).sort()
    expect(names).toEqual([
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
      'project_create',
      'project_get',
      'project_update',
      'projects_list',
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
    const toolMap = new Map(toolsRes.tools.map((t) => [t.name, t]))

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
    ]

    for (const name of readOnlyTools) {
      const tool = toolMap.get(name)
      expect(tool, `tool ${name} should exist`).toBeDefined()
      expect(tool?.annotations?.readOnlyHint, `${name} readOnlyHint`).toBe(true)
      expect(tool?.annotations?.destructiveHint, `${name} destructiveHint`).toBe(false)
      expect(tool?.annotations?.idempotentHint, `${name} idempotentHint`).toBe(true)
      expect(tool?.annotations?.openWorldHint, `${name} openWorldHint`).toBe(false)
    }

    const creationTools = ['project_create', 'issue_create', 'issue_comment', 'label_create']
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
      expect(tool?.annotations?.destructiveHint, `${name} destructiveHint`).toBe(false)
      expect(tool?.annotations?.idempotentHint, `${name} idempotentHint`).toBe(true)
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
    expect(toolsRes.tools.length).toBe(17)

    const names = toolsRes.tools.map((t) => t.name)
    expect(new Set(names).size).toBe(17)

    for (const tool of toolsRes.tools) {
      expect(tool.inputSchema, `${tool.name} inputSchema`).toBeDefined()
      expect(tool.inputSchema.type, `${tool.name} inputSchema.type`).toBe('object')
      expect(tool.outputSchema, `${tool.name} outputSchema`).toBeDefined()
      expect(tool.outputSchema?.type, `${tool.name} outputSchema.type`).toBe('object')
      expect(tool.description?.trim().length, `${tool.name} description`).toBeGreaterThan(40)

      const properties = (tool.inputSchema.properties ?? {}) as Record<string, Record<string, unknown>>
      const propNames = Object.keys(properties)
      expect(propNames).not.toContain('organizationId')
      expect(propNames).not.toContain('organization_id')
      expect(propNames).not.toContain('orgId')

      for (const [paramName, paramSchema] of Object.entries(properties)) {
        expect(paramName.length).toBeGreaterThan(0)
        expect(paramSchema.description, `${tool.name}.${paramName} description`).toBeDefined()
        expect(String(paramSchema.description).trim().length).toBeGreaterThan(0)
      }

      for (const required of tool.inputSchema.required ?? []) {
        expect(propNames).toContain(required)
      }
    }

    // Specific tool contract checks
    const toolMap = new Map(toolsRes.tools.map((t) => [t.name, t]))

    // issues_list
    const issuesList = toolMap.get('issues_list')
    const issuesListProps = (issuesList?.inputSchema.properties ?? {}) as Record<string, Record<string, unknown>>
    expect(issuesListProps.status?.enum).toBeUndefined()
    expect(issuesListProps.status?.description).toContain('configured workflow-state key')
    expect(issuesListProps.status?.description).toContain('workflow_states_list')

    // issue_create priority enum
    const issueCreate = toolMap.get('issue_create')
    const issueCreateProps = (issueCreate?.inputSchema.properties ?? {}) as Record<string, Record<string, unknown>>
    expect(issueCreateProps.priority?.enum).toEqual(['none', 'low', 'medium', 'high', 'urgent'])

    // issue mutations expose work structure fields
    for (const name of ['issue_create', 'issue_update']) {
      const tool = toolMap.get(name)
      const props = (tool?.inputSchema.properties ?? {}) as Record<string, Record<string, unknown>>
      expect(props.status?.enum).toBeUndefined()
      expect(props.typeKey?.type).toBe('string')
      expect(props.milestoneId).toBeDefined()
      expect(props.customFields?.type).toBe('array')
    }

    // project mutations expose defaultWorkItemTypeId
    for (const name of ['project_create', 'project_update']) {
      const tool = toolMap.get(name)
      const props = (tool?.inputSchema.properties ?? {}) as Record<string, Record<string, unknown>>
      expect(props.defaultWorkItemTypeId).toBeDefined()
      expect(props.defaultWorkItemTypeId?.description).toContain('work_item_types_list')
    }

    // work structure list tools exist with workspace-scoped inputs
    const workItemTypes = toolMap.get('work_item_types_list')
    const workflowStates = toolMap.get('workflow_states_list')
    const milestones = toolMap.get('milestones_list')
    expect(workItemTypes?.inputSchema.properties).toEqual({})
    expect(workflowStates?.inputSchema.properties).toEqual({})
    expect(milestones?.inputSchema.required).toEqual(['projectId'])

    // issue_comments
    const issueComments = toolMap.get('issue_comments')
    expect(issueComments?.inputSchema.required).toEqual(['issue'])
    expect(issueComments?.description).toContain('oldest first')

    // issue_get
    const issueGet = toolMap.get('issue_get')
    const issueGetProps = (issueGet?.inputSchema.properties ?? {}) as Record<string, Record<string, unknown>>
    expect(issueGet?.inputSchema.required).toEqual(['issue'])
    expect(issueGetProps.includeComments?.type).toBe('boolean')
    expect(issueGet?.description).toContain('configured workflow state')
    expect(issueGet?.description).toContain('custom-field values')

    await client.close()
    await server.close()
  })

  it('executes tools and returns structured content alongside text', async () => {
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
        data: [mockIssue],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_test_123/issues',
      },
      error: null,
    })
    vi.spyOn(operatorClient.issues, 'retrieve').mockResolvedValue({
      data: mockIssue,
      error: null,
    })
    vi.spyOn(operatorClient.comments, 'list').mockResolvedValue({
      data: {
        object: 'list',
        data: [mockComment],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_test_123/issues/iss_123/comments',
      },
      error: null,
    })
    vi.spyOn(operatorClient.issues, 'create').mockResolvedValue({
      data: mockIssue,
      error: null,
    })
    vi.spyOn(operatorClient.issues, 'update').mockResolvedValue({
      data: mockIssue,
      error: null,
    })
    vi.spyOn(operatorClient.comments, 'create').mockResolvedValue({
      data: mockComment,
      error: null,
    })

    const server = buildProjectsMcpServer(
      { ...config, defaultUserId: 'usr_test' },
      operatorClient
    )
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)

    const client = new Client({ name: 'test-client', version: '1.0.0' })
    await client.connect(clientTransport)

    // 1. workspace_get
    const wsRes = await client.callTool({ name: 'workspace_get', arguments: {} })
    expect(wsRes.isError).toBeFalsy()
    expect(wsRes.structuredContent).toBeDefined()
    const wsData = wsRes.structuredContent as { tenant: typeof mockTenant; projects: unknown[] }
    expect(wsData.tenant.id).toBe(mockTenant.id)
    expect(wsData.projects.length).toBe(1)

    // 2. projects_list
    const projListRes = await client.callTool({ name: 'projects_list', arguments: { limit: 10 } })
    expect(projListRes.isError).toBeFalsy()
    const projListData = projListRes.structuredContent as { projects: typeof mockProject[]; hasMore: boolean }
    expect(projListData.projects[0]?.id).toBe(mockProject.id)
    expect(projListData.hasMore).toBe(false)

    // 3. issue_get
    const issueGetRes = await client.callTool({
      name: 'issue_get',
      arguments: { issue: 'CONSOLE-12' },
    })
    expect(issueGetRes.isError).toBeFalsy()
    const issueGetData = issueGetRes.structuredContent as { issue: typeof mockIssue; comments: typeof mockComment[] }
    expect(issueGetData.issue.id).toBe(mockIssue.id)
    expect(issueGetData.comments.length).toBe(1)

    // 4. issue_create
    const issueCreateRes = await client.callTool({
      name: 'issue_create',
      arguments: { title: 'New task', project: 'CONSOLE' },
    })
    expect(issueCreateRes.isError).toBeFalsy()
    const issueCreateData = issueCreateRes.structuredContent as { issue: typeof mockIssue }
    expect(issueCreateData.issue.id).toBe(mockIssue.id)

    // 5. issue_update
    const issueUpdateRes = await client.callTool({
      name: 'issue_update',
      arguments: { issue: 'iss_123', title: 'Updated task' },
    })
    expect(issueUpdateRes.isError).toBeFalsy()
    const issueUpdateData = issueUpdateRes.structuredContent as { issue: typeof mockIssue }
    expect(issueUpdateData.issue.id).toBe(mockIssue.id)

    // 6. issue_comment
    const commentRes = await client.callTool({
      name: 'issue_comment',
      arguments: { issue: 'iss_123', body: 'Added comment' },
    })
    expect(commentRes.isError).toBeFalsy()
    const commentData = commentRes.structuredContent as { comment: typeof mockComment }
    expect(commentData.comment.id).toBe(mockComment.id)

    await client.close()
    await server.close()
  })

  it('handles application errors gracefully with isError: true', async () => {
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

    const res = await client.callTool({
      name: 'issue_get',
      arguments: { issue: 'NOTFOUND-99' },
    })

    expect(res.isError).toBe(true)
    const textBlock = res.content[0]
    expect(textBlock?.type).toBe('text')
    if (textBlock?.type === 'text') {
      expect(textBlock.text).toContain('projects/issue-not-found')
    }

    await client.close()
    await server.close()
  })
})
