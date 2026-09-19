import {
  Client,
  StreamableHTTPClientTransport,
  type VersionNegotiationMode,
} from '@modelcontextprotocol/client'
import { createMcpHandler } from '@modelcontextprotocol/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  config,
  createClient,
  mockIssue,
  mockProject,
  mockTenant,
  mockWorkflowState,
} from './handlers.test-fixtures'
import { PROJECTS_SERVER_INSTRUCTIONS } from './instructions'
import { buildProjectsMcpServer } from './server'

describe('protocol era compatibility', () => {
  const { client: operatorClient } = createClient()

  beforeEach(() => {
    vi.restoreAllMocks()

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
  })

  function createTransport(): StreamableHTTPClientTransport {
    const handler = createMcpHandler(() =>
      buildProjectsMcpServer(config, operatorClient)
    )

    return new StreamableHTTPClientTransport(new URL('http://test.local/mcp'), {
      fetch: (url, init) => handler.fetch(new Request(url, init)),
    })
  }

  function createProtocolClient(mode: VersionNegotiationMode): Client {
    return new Client(
      { name: 'projects-mcp-test-client', version: '1.0.0' },
      { versionNegotiation: { mode } }
    )
  }

  it('negotiates pinned MCP 2026-07-28 through server discovery', async () => {
    const client = createProtocolClient({ pin: '2026-07-28' })

    await client.connect(createTransport())

    expect(client.getProtocolEra()).toBe('modern')
    expect(client.getDiscoverResult()?.supportedVersions).toContain(
      '2026-07-28'
    )
    expect(client.getDiscoverResult()?.instructions).toBe(
      PROJECTS_SERVER_INSTRUCTIONS
    )
    expect(client.getServerVersion()).toEqual({
      name: '876-projects',
      version: '0.2.0',
    })

    await client.close()
  })

  it('serves legacy 2025-era clients from the same server factory', async () => {
    const client = createProtocolClient('legacy')

    await client.connect(createTransport())

    expect(client.getProtocolEra()).toBe('legacy')
    expect(client.getDiscoverResult()).toBeUndefined()
    expect(client.getInstructions()).toBe(PROJECTS_SERVER_INSTRUCTIONS)
    expect(client.getServerVersion()).toEqual({
      name: '876-projects',
      version: '0.2.0',
    })

    await client.close()
  })

  it('auto-negotiates the modern era when the server offers it', async () => {
    const client = createProtocolClient('auto')

    await client.connect(createTransport())

    expect(client.getProtocolEra()).toBe('modern')
    expect(client.getDiscoverResult()?.supportedVersions).toContain(
      '2026-07-28'
    )

    await client.close()
  })

  it('returns structured tool output on a modern request', async () => {
    const client = createProtocolClient({ pin: '2026-07-28' })
    await client.connect(createTransport())

    const result = await client.callTool({
      name: 'workspace_get',
      arguments: {},
    })

    expect(result.isError).toBeFalsy()
    expect(result.structuredContent).toEqual({
      tenant: mockTenant,
      projects: [{ project: mockProject, openIssueCount: 1 }],
    })

    await client.close()
  })
})
