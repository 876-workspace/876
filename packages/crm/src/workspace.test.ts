import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@876/core/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@876/core/client')>()),
  sendClientRequest: vi.fn(),
}))

import { sendClientRequest } from '@876/core/client'
import { create876CrmWorkspaceClient } from './workspace.js'

type ClientResponse = Awaited<ReturnType<typeof sendClientRequest>>
const mockSend = vi.mocked(sendClientRequest)

const workspace = {
  id: 'crm_tnt_1',
  organizationId: 'org_1',
  status: 'ACTIVE' as const,
  nextRequestNumber: 1,
  provisioningRevision: 0,
  provisionedAt: null,
  createdAt: '2026-08-29T03:00:00.000Z',
  updatedAt: '2026-08-29T03:00:00.000Z',
}

function json(data: unknown) {
  return {
    ok: true,
    payload: { data, error: null },
  } as unknown as ClientResponse
}

describe('CRM workspace control client', () => {
  beforeEach(() => {
    mockSend.mockReset()
    mockSend.mockResolvedValue(json(workspace))
  })

  it('retrieves a service workspace by organization without product entitlement semantics', async () => {
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.example.test',
      internalKey: 'crm_internal',
    })

    const result = await client.retrieve('org_1')

    expect(result).toEqual({ data: workspace, error: null })
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      path: '/v1/tenants?organizationId=org_1',
      headers: { 'x-internal-key': 'crm_internal' },
    })
  })

  it('ensures the workspace through the idempotent tenant endpoint', async () => {
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.example.test',
      internalKey: 'crm_internal',
    })

    const result = await client.ensure('org_1')

    expect(result).toEqual({ data: workspace, error: null })
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      path: '/v1/tenants',
      body: { organizationId: 'org_1' },
      headers: { 'x-internal-key': 'crm_internal' },
    })
  })
})
