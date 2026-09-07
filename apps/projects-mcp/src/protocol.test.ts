import { Client } from '@modelcontextprotocol/client'
import { InMemoryTransport } from '@modelcontextprotocol/server'
import { serveStdio } from '@modelcontextprotocol/server/stdio'
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

describe('protocol conformance (MCP 2026-07-28 + legacy 2025)', () => {
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

  it('serves modern MCP 2026-07-28 clients via server/discover probe', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

    const handle = serveStdio(
      () => buildProjectsMcpServer(config, operatorClient),
      {
        legacy: 'serve',
        transport: serverTransport,
      }
    )

    const client = new Client(
      { name: 'modern-test-client', version: '1.0.0' },
      {
        versionNegotiation: { mode: { pin: '2026-07-28' } },
      }
    )

    await client.connect(clientTransport)

    // Discover metadata verification
    const discoverResult = client.getDiscoverResult()
    expect(discoverResult).toBeDefined()
    expect(discoverResult?.supportedVersions).toContain('2026-07-28')
    expect(discoverResult?.instructions).toBe(PROJECTS_SERVER_INSTRUCTIONS)

    const serverVersion = client.getServerVersion()
    expect(serverVersion?.name).toBe('876-projects')
    expect(serverVersion?.version).toBe('0.2.0')

    // Tool discovery
    const toolsRes = await client.listTools()
    expect(toolsRes.tools.length).toBe(17)

    // Tool call with structured output
    const callRes = await client.callTool({
      name: 'workspace_get',
      arguments: {},
    })
    expect(callRes.isError).toBeFalsy()
    expect(callRes.structuredContent).toBeDefined()
    const content = callRes.structuredContent as {
      tenant: typeof mockTenant
      projects: Array<{ project: typeof mockProject; openIssueCount: number }>
    }
    expect(content.tenant.id).toBe(mockTenant.id)
    expect(content.projects[0]?.project.id).toBe(mockProject.id)

    await client.close()
    await handle.close()
  })

  it('serves legacy 2025-era MCP clients via 2025 initialize handshake', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

    const handle = serveStdio(
      () => buildProjectsMcpServer(config, operatorClient),
      {
        legacy: 'serve',
        transport: serverTransport,
      }
    )

    const client = new Client(
      { name: 'legacy-test-client', version: '1.0.0' },
      {
        versionNegotiation: { mode: 'legacy' },
      }
    )

    await client.connect(clientTransport)

    // Legacy client has no discoverResult (performed 2025 initialize)
    expect(client.getDiscoverResult()).toBeUndefined()

    const serverVersion = client.getServerVersion()
    expect(serverVersion?.name).toBe('876-projects')
    expect(serverVersion?.version).toBe('0.2.0')

    // Instructions are surfaced to legacy clients
    expect(client.getInstructions()).toBe(PROJECTS_SERVER_INSTRUCTIONS)

    // Tool discovery works on legacy client
    const toolsRes = await client.listTools()
    expect(toolsRes.tools.length).toBe(17)

    // Tool invocation works on legacy client
    const callRes = await client.callTool({
      name: 'workspace_get',
      arguments: {},
    })
    expect(callRes.isError).toBeFalsy()
    expect(callRes.structuredContent).toBeDefined()

    await client.close()
    await handle.close()
  })

  it('supports auto-negotiation mode, upgrading to modern MCP 2026-07-28', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

    const handle = serveStdio(
      () => buildProjectsMcpServer(config, operatorClient),
      {
        legacy: 'serve',
        transport: serverTransport,
      }
    )

    const client = new Client(
      { name: 'auto-negotiation-client', version: '1.0.0' },
      {
        versionNegotiation: { mode: 'auto' },
      }
    )

    await client.connect(clientTransport)

    // Auto-mode discovers modern server and upgrades
    const discoverResult = client.getDiscoverResult()
    expect(discoverResult).toBeDefined()
    expect(discoverResult?.supportedVersions).toContain('2026-07-28')

    const toolsRes = await client.listTools()
    expect(toolsRes.tools.length).toBe(17)

    await client.close()
    await handle.close()
  })

  it('rejects legacy clients when legacy mode is set to reject', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

    const handle = serveStdio(
      () => buildProjectsMcpServer(config, operatorClient),
      {
        legacy: 'reject',
        transport: serverTransport,
      }
    )

    const client = new Client(
      { name: 'legacy-rejected-client', version: '1.0.0' },
      {
        versionNegotiation: { mode: 'legacy' },
      }
    )

    await expect(client.connect(clientTransport)).rejects.toThrow(
      /Unsupported protocol version/
    )

    await handle.close()
  })
})
