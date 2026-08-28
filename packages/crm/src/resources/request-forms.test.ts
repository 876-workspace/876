import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('@876/core/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@876/core/client')>()),
  sendClientRequest: vi.fn(),
}))
import { sendClientRequest } from '@876/core/client'
import { create876CrmClient } from '../client.js'

type ClientResponse = Awaited<ReturnType<typeof sendClientRequest>>
const mockSend = vi.mocked(sendClientRequest)

function json(data: unknown, ok = true) {
  return { ok, payload: { data, error: null } } as unknown as ClientResponse
}
function errorPayload(code: string, message: string) {
  return {
    ok: true,
    payload: { data: null, error: { code, message } },
  } as unknown as ClientResponse
}
function malformed() {
  return { ok: true, payload: { bad: true } } as unknown as ClientResponse
}
function networkError() {
  return { networkError: true } as unknown as ClientResponse
}

const form = {
  object: 'request_form' as const,
  id: 'crm_form_1',
  tenantId: 'crm_tenant_1',
  name: 'Support Intake',
  slug: 'support-intake',
  description: null,
  status: 'PUBLISHED' as const,
  definition: {
    fields: [
      {
        id: 'f1',
        key: 'subject',
        label: 'Subject',
        required: true,
        type: 'TEXT' as const,
        mapping: 'REQUEST_SUBJECT' as const,
      },
      {
        id: 'f2',
        key: 'details',
        label: 'Details',
        required: false,
        type: 'LONG_TEXT' as const,
        mapping: 'REQUEST_DESCRIPTION' as const,
      },
    ],
  },
  publishedDefinition: {
    fields: [
      {
        id: 'f1',
        key: 'subject',
        label: 'Subject',
        required: true,
        type: 'TEXT' as const,
        mapping: 'REQUEST_SUBJECT' as const,
      },
    ],
  },
  version: 1,
  defaultCategoryId: null,
  defaultSubcategoryId: null,
  defaultTeamId: null,
  defaultPriority: null,
  confirmationTitle: null,
  confirmationMessage: null,
  createdBy: 'usr_1',
  publishedAt: 1,
  createdAt: 1,
  updatedAt: 1,
}

const client = create876CrmClient({
  baseUrl: 'http://crm.test',
  internalKey: 'crm-internal',
  fetch: vi.fn() as unknown as typeof fetch,
})

beforeEach(() => vi.clearAllMocks())

describe('requestForms - list', () => {
  it('requests GET at organization-scoped path without filter', async () => {
    // ARRANGE
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [form],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/request-forms',
      })
    )
    // ACT
    const result = await client.requestForms.list('org_1')
    // ASSERT
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'GET',
        path: '/v1/organizations/org_1/request-forms',
      })
    )
    expect(result.data?.data).toEqual([form])
    expect(result.error).toBeNull()
    expect(result.data?.object).toBe('list')
  })

  it('appends status as query string when provided', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/x',
      })
    )
    await client.requestForms.list('org_1', { status: 'PUBLISHED' })
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: '/v1/organizations/org_1/request-forms?status=PUBLISHED',
      })
    )
  })

  it('encodes organizationId with spaces and slashes', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/x',
      })
    )
    await client.requestForms.list('org /north')
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: expect.stringContaining('org%20%2Fnorth'),
      })
    )
  })

  it('forwards AbortSignal', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/x',
      })
    )
    const controller = new AbortController()
    await client.requestForms.list('org_1', { signal: controller.signal })
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: controller.signal })
    )
  })

  it('returns invalid-response when payload is malformed', async () => {
    mockSend.mockResolvedValue(malformed())
    const result = await client.requestForms.list('org_1')
    expect(result).toEqual({
      data: null,
      error: { code: 'crm/invalid-response', message: expect.any(String) },
    })
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('propagates envelope error', async () => {
    mockSend.mockResolvedValue(
      errorPayload('crm/tenant-not-found', 'no workspace')
    )
    const result = await client.requestForms.list('org_1')
    expect(result).toEqual({
      data: null,
      error: { code: 'crm/tenant-not-found', message: 'no workspace' },
    })
  })

  it('fails closed when not configured and does not call network', async () => {
    const unconfigured = create876CrmClient({
      baseUrl: 'http://crm.test',
      fetch: vi.fn() as unknown as typeof fetch,
    })
    const result = await unconfigured.requestForms.list('org_1')
    expect(result).toEqual({
      data: null,
      error: { code: 'crm/not-configured', message: expect.any(String) },
    })
    expect(mockSend).not.toHaveBeenCalled()
    expect(result.data).toBeNull()
  })

  it.each([['DRAFT'], ['PUBLISHED'], ['ARCHIVED']] as const)(
    'lists with status %s',
    async (status) => {
      mockSend.mockResolvedValue(
        json({
          object: 'list',
          data: [],
          has_more: false,
          total_count: 0,
          url: '/x',
        })
      )
      await client.requestForms.list('org_1', { status: status as never })
      expect(mockSend).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          path: expect.stringContaining(`status=${status}`),
        })
      )
    }
  )
})

describe('requestForms - retrieve', () => {
  it('requests GET with encoded organizationId and form id', async () => {
    mockSend.mockResolvedValue(json(form))
    const result = await client.requestForms.retrieve('org /north', 'form /1')
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'GET',
        path: '/v1/organizations/org%20%2Fnorth/request-forms/form%20%2F1',
      })
    )
    expect(result.data?.id).toBe('crm_form_1')
    expect(result.error).toBeNull()
  })

  it('returns invalid-response when form shape is invalid', async () => {
    mockSend.mockResolvedValue(json({ object: 'request_form', id: 'bad' }))
    const result = await client.requestForms.retrieve('org_1', 'bad')
    expect(result).toEqual({
      data: null,
      error: { code: 'crm/invalid-response', message: expect.any(String) },
    })
  })

  it('forwards signal on retrieve', async () => {
    mockSend.mockResolvedValue(json(form))
    const c = new AbortController()
    await client.requestForms.retrieve('org_1', 'form_1', { signal: c.signal })
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: c.signal })
    )
  })

  it('propagates network/offline', async () => {
    mockSend.mockResolvedValue(networkError())
    const result = await client.requestForms.retrieve('org_1', 'form_1')
    expect(result.error?.code).toBe('network/offline')
    expect(result.data).toBeNull()
  })
})

describe('requestForms - create', () => {
  it('sends POST with JSON body and returns created form', async () => {
    mockSend.mockResolvedValue({
      ok: true,
      payload: { data: form, error: null },
    } as unknown as ClientResponse)
    const input = {
      name: 'Support Intake',
      slug: 'support-intake',
      definition: form.definition,
      createdBy: 'usr_1',
    }
    const result = await client.requestForms.create('org_1', input)
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org_1/request-forms',
        body: input,
      })
    )
    expect(result.data?.slug).toBe('support-intake')
    expect(result.error).toBeNull()
  })

  it('encodes organizationId on create path', async () => {
    mockSend.mockResolvedValue(json(form))
    await client.requestForms.create('org /1', {
      name: 'x',
      slug: 'x',
      definition: form.definition,
      createdBy: 'usr_1',
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: '/v1/organizations/org%20%2F1/request-forms',
      })
    )
  })

  it('propagates form-slug-taken error', async () => {
    mockSend.mockResolvedValue(
      errorPayload('crm/form-slug-taken', 'slug taken')
    )
    const result = await client.requestForms.create('org_1', {
      name: 'x',
      slug: 'dup',
      definition: form.definition,
      createdBy: 'usr_1',
    })
    expect(result).toEqual({
      data: null,
      error: { code: 'crm/form-slug-taken', message: 'slug taken' },
    })
  })

  it('forwards signal on create', async () => {
    mockSend.mockResolvedValue(json(form))
    const c = new AbortController()
    await client.requestForms.create(
      'org_1',
      { name: 'x', slug: 'x', definition: form.definition, createdBy: 'usr_1' },
      { signal: c.signal }
    )
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: c.signal })
    )
  })
})

describe('requestForms - update', () => {
  it('sends PATCH with encoded ids and returns updated form', async () => {
    mockSend.mockResolvedValue(json({ ...form, name: 'Renamed' }))
    const result = await client.requestForms.update('org_1', 'crm_form_1', {
      name: 'Renamed',
      slug: 'support-intake',
      definition: form.definition,
      updatedBy: 'usr_1',
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'PATCH',
        path: '/v1/organizations/org_1/request-forms/crm_form_1',
      })
    )
    expect(result.data?.name).toBe('Renamed')
    expect(result.error).toBeNull()
  })

  it('publishes with status PUBLISHED via PATCH', async () => {
    mockSend.mockResolvedValue(
      json({ ...form, status: 'PUBLISHED', version: 2 })
    )
    const result = await client.requestForms.update('org_1', 'crm_form_1', {
      status: 'PUBLISHED',
      updatedBy: 'usr_1',
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'PATCH',
        body: expect.objectContaining({ status: 'PUBLISHED' }),
      })
    )
    expect(result.data?.status).toBe('PUBLISHED')
    expect(result.data?.version).toBe(2)
  })

  it('encodes special characters on update path', async () => {
    mockSend.mockResolvedValue(json(form))
    await client.requestForms.update('org /north', 'form /1', {
      updatedBy: 'usr_1',
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: '/v1/organizations/org%20%2Fnorth/request-forms/form%20%2F1',
      })
    )
  })

  it('returns invalid-response when update payload is malformed', async () => {
    mockSend.mockResolvedValue(json({ object: 'request_form', id: 'bad' }))
    const result = await client.requestForms.update('org_1', 'form_1', {
      updatedBy: 'usr_1',
    })
    expect(result.error?.code).toBe('crm/invalid-response')
  })

  it('propagates form-not-found via envelope error', async () => {
    mockSend.mockResolvedValue(errorPayload('crm/form-not-found', 'not found'))
    const result = await client.requestForms.update('org_1', 'missing', {
      updatedBy: 'usr_1',
    })
    expect(result.error?.code).toBe('crm/form-not-found')
  })
})

describe('requestForms - delete', () => {
  it('sends DELETE with body containing deletedBy and reason', async () => {
    mockSend.mockResolvedValue(
      json({ object: 'request_form', id: 'crm_form_1', deleted: true })
    )
    const result = await client.requestForms.delete('org_1', 'crm_form_1', {
      deletedBy: 'usr_1',
      reason: 'no longer needed',
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'DELETE',
        path: '/v1/organizations/org_1/request-forms/crm_form_1',
        body: { deletedBy: 'usr_1', reason: 'no longer needed' },
      })
    )
    expect(result.data?.deleted).toBe(true)
    expect(result.error).toBeNull()
  })

  it('sends null reason correctly', async () => {
    mockSend.mockResolvedValue(
      json({ object: 'request_form', id: 'crm_form_1', deleted: true })
    )
    await client.requestForms.delete('org_1', 'crm_form_1', {
      deletedBy: 'usr_1',
      reason: null,
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ body: { deletedBy: 'usr_1', reason: null } })
    )
  })

  it('encodes ids on delete path', async () => {
    mockSend.mockResolvedValue(
      json({ object: 'request_form', id: 'form /1', deleted: true })
    )
    await client.requestForms.delete('org /1', 'form /1', {
      deletedBy: 'usr_1',
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: '/v1/organizations/org%20%2F1/request-forms/form%20%2F1',
      })
    )
  })

  it('propagates form-in-use when hard delete blocked', async () => {
    mockSend.mockResolvedValue(
      errorPayload('crm/form-in-use', 'has submissions')
    )
    const result = await client.requestForms.delete('org_1', 'crm_form_1', {
      deletedBy: 'usr_1',
    })
    expect(result).toEqual({
      data: null,
      error: { code: 'crm/form-in-use', message: 'has submissions' },
    })
  })

  it('forwards signal on delete', async () => {
    mockSend.mockResolvedValue(
      json({ object: 'request_form', id: 'crm_form_1', deleted: true })
    )
    const c = new AbortController()
    await client.requestForms.delete(
      'org_1',
      'crm_form_1',
      { deletedBy: 'usr_1' },
      { signal: c.signal }
    )
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: c.signal })
    )
  })

  it('returns invalid-response when delete response is malformed', async () => {
    mockSend.mockResolvedValue(json({ object: 'request_form', id: 'bad' }))
    const result = await client.requestForms.delete('org_1', 'form_1', {
      deletedBy: 'usr_1',
    })
    expect(result.error?.code).toBe('crm/invalid-response')
  })
})

describe('requestForms - security and edge cases', () => {
  it.each([
    '<script>alert(1)</script>',
    "' OR '1'='1",
    '../../etc/passwd',
    '__proto__',
    '\u0000',
    'a'.repeat(10_000),
  ])(
    'does not mangle security input in path encoding for %s',
    async (input) => {
      mockSend.mockResolvedValue(
        json({
          object: 'list',
          data: [],
          has_more: false,
          total_count: 0,
          url: '/x',
        })
      )
      await client.requestForms.list(input)
      expect(mockSend).toHaveBeenCalledTimes(1)
      const path = mockSend.mock.calls[0][1].path as string
      expect(path).toContain(encodeURIComponent(input))
    }
  )

  it('does not send x-internal-key when not configured on delete', async () => {
    const unconfigured = create876CrmClient({
      baseUrl: 'http://crm.test',
      fetch: vi.fn() as unknown as typeof fetch,
    })
    const result = await unconfigured.requestForms.delete('org_1', 'form_1', {
      deletedBy: 'usr_1',
    })
    expect(result.error?.code).toBe('crm/not-configured')
    expect(mockSend).not.toHaveBeenCalled()
  })
})
