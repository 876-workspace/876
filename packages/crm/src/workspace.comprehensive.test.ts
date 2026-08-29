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

function err(message: string) {
  return {
    ok: false,
    payload: { data: null, error: { code: 'crm/test-error', message } },
  } as unknown as ClientResponse
}

describe('CRM workspace client — comprehensive', () => {
  beforeEach(() => {
    mockSend.mockReset()
    mockSend.mockResolvedValue(json(workspace))
  })

  it('retrieve: uses GET with encoded organizationId', async () => {
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.test',
      internalKey: 'k',
    })
    await client.retrieve('org_1')
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'GET',
        path: '/v1/tenants?organizationId=org_1',
      })
    )
  })

  it('retrieve: encodes special characters in organizationId', async () => {
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.test',
      internalKey: 'k',
    })
    await client.retrieve('org/1?test=1&x=2')
    const path = mockSend.mock.calls[0]?.[1].path as string
    expect(path).toBe(
      `/v1/tenants?organizationId=${encodeURIComponent('org/1?test=1&x=2')}`
    )
  })

  it('retrieve: sends internal key header', async () => {
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.test',
      internalKey: 'secret123',
    })
    await client.retrieve('org_1')
    expect(mockSend.mock.calls[0]?.[1].headers).toMatchObject({
      'x-internal-key': 'secret123',
    })
  })

  it('retrieve: returns data on success', async () => {
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.test',
      internalKey: 'k',
    })
    const result = await client.retrieve('org_1')
    expect(result).toEqual({ data: workspace, error: null })
  })

  it('retrieve: propagates error payload', async () => {
    mockSend.mockResolvedValue(err('not found'))
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.test',
      internalKey: 'k',
    })
    const result = await client.retrieve('org_missing')
    expect(result).toEqual({
      data: null,
      error: { code: 'crm/test-error', message: 'not found' },
    })
  })

  it('retrieve: propagates thrown transport error', async () => {
    mockSend.mockRejectedValue(new Error('network down'))
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.test',
      internalKey: 'k',
    })
    await expect(client.retrieve('org_1')).rejects.toThrow('network down')
  })

  it('retrieve: forwards AbortSignal', async () => {
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.test',
      internalKey: 'k',
    })
    const controller = new AbortController()
    await client.retrieve('org_1', { signal: controller.signal })
    expect(mockSend.mock.calls[0]?.[1].signal).toBe(controller.signal)
  })

  it('ensure: uses POST to idempotent tenant endpoint without provisioning', async () => {
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.test',
      internalKey: 'k',
    })
    await client.ensure('org_42')
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/tenants',
        body: { organizationId: 'org_42' },
      })
    )
  })

  it('ensure: includes provisioning when provided', async () => {
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.test',
      internalKey: 'k',
    })
    const provisioning = { categoriesSync: true } as never
    await client.ensure('org_1', provisioning)
    expect(mockSend.mock.calls[0]?.[1].body).toEqual({
      organizationId: 'org_1',
      provisioning,
    })
  })

  it('ensure: sends internal key header', async () => {
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.test',
      internalKey: 'mykey',
    })
    await client.ensure('org_1')
    expect(mockSend.mock.calls[0]?.[1].headers).toMatchObject({
      'x-internal-key': 'mykey',
    })
  })

  it('ensure: returns workspace data on success', async () => {
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.test',
      internalKey: 'k',
    })
    const result = await client.ensure('org_1')
    expect(result).toEqual({ data: workspace, error: null })
  })

  it('ensure: idempotent — second call same payload', async () => {
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.test',
      internalKey: 'k',
    })
    await client.ensure('org_dup')
    await client.ensure('org_dup')
    expect(mockSend).toHaveBeenCalledTimes(2)
    expect(mockSend.mock.calls[0]?.[1].body).toEqual(
      mockSend.mock.calls[1]?.[1].body
    )
  })

  it('ensure: propagates error payload on failure', async () => {
    mockSend.mockResolvedValue(err('quota exceeded'))
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.test',
      internalKey: 'k',
    })
    const result = await client.ensure('org_fail')
    expect(result).toEqual({
      data: null,
      error: { code: 'crm/test-error', message: 'quota exceeded' },
    })
  })

  it('ensure: propagates thrown error', async () => {
    mockSend.mockRejectedValue(new Error('timeout'))
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.test',
      internalKey: 'k',
    })
    await expect(client.ensure('org_1')).rejects.toThrow('timeout')
  })

  it('ensure: forwards AbortSignal', async () => {
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.test',
      internalKey: 'k',
    })
    const controller = new AbortController()
    await client.ensure('org_1', undefined, { signal: controller.signal })
    expect(mockSend.mock.calls[0]?.[1].signal).toBe(controller.signal)
  })

  it('ensure does not imply product entitlement — workspace exists without 876-crm subscription', async () => {
    // This test documents the architecture: ensure creates service workspace, not entitlements
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.test',
      internalKey: 'k',
    })
    const result = await client.ensure('org_no_product')
    expect(result).toEqual({ data: workspace, error: null })
    // No call to Core entitlements — verified by only one transport call to CRM tenant endpoint
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend.mock.calls[0]?.[1].path as string).toBe('/v1/tenants')
  })

  it('client respects custom baseUrl', async () => {
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://custom.crm.example',
      internalKey: 'k',
    })
    await client.retrieve('org_1')
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: 'https://custom.crm.example' }),
      expect.anything()
    )
  })

  it('handles organizationId with unicode', async () => {
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.test',
      internalKey: 'k',
    })
    await client.retrieve('org_🔥')
    expect(mockSend.mock.calls[0]?.[1].path as string).toContain(
      encodeURIComponent('org_🔥')
    )
  })

  it('handles very long organizationId', async () => {
    const long = 'org_' + 'a'.repeat(200)
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.test',
      internalKey: 'k',
    })
    await client.retrieve(long)
    expect(mockSend.mock.calls[0]?.[1].path as string).toContain(
      encodeURIComponent(long)
    )
  })

  it('concurrent retrieve calls are independent', async () => {
    mockSend
      .mockResolvedValueOnce(json({ ...workspace, organizationId: 'org_a' }))
      .mockResolvedValueOnce(json({ ...workspace, organizationId: 'org_b' }))
    const client = create876CrmWorkspaceClient({
      baseUrl: 'https://crm.test',
      internalKey: 'k',
    })
    const [a, b] = await Promise.all([
      client.retrieve('org_a'),
      client.retrieve('org_b'),
    ])
    expect(a.data).toMatchObject({ organizationId: 'org_a' })
    expect(b.data).toMatchObject({ organizationId: 'org_b' })
  })
})
