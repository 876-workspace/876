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
function json(data: unknown) {
  return {
    ok: true,
    payload: { data, error: null },
  } as unknown as ClientResponse
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

const submission = {
  object: 'request_form_submission' as const,
  id: 'sub_1',
  formId: 'crm_form_1',
  formVersion: 1,
  request: {
    object: 'request' as const,
    id: 'crm_req_1',
    tenantId: 'crm_tenant_1',
    customerId: 'crm_cus_1',
    number: 1,
    subject: 'Need help',
    categoryId: null,
    subcategoryId: null,
    status: 'OPEN' as const,
    priority: 'NORMAL' as const,
    source: 'WEB' as const,
    teamId: null,
    assigneeId: null,
    ownerId: null,
    requesterUserId: null,
    requesterContactId: null,
    createdBy: 'usr_1',
    resolvedAt: null,
    closedAt: null,
    createdAt: 1,
    updatedAt: 1,
  },
  createdAt: 1,
}
const record = {
  object: 'request_form_submission_record' as const,
  id: 'sub_1',
  formId: 'crm_form_1',
  requestId: 'crm_req_1',
  formVersion: 1,
  definitionSnapshot: { fields: [] },
  answers: { subject: 'hi' },
  customerOrganizationId: 'org_1',
  customerUserId: null,
  requesterUserId: null,
  requesterContactId: null,
  createdBy: 'usr_1',
  createdAt: 1,
}

const client = create876CrmClient({
  baseUrl: 'http://crm.test',
  internalKey: 'k',
  fetch: vi.fn() as unknown as typeof fetch,
})
beforeEach(() => vi.clearAllMocks())

describe('requestFormSubmissions - create', () => {
  it('sends POST to form-scoped submissions path with encoded ids', async () => {
    mockSend.mockResolvedValue(json(submission))
    const result = await client.requestFormSubmissions.create(
      'org /1',
      'form /2',
      {
        answers: { subject: 'Need help' },
        customerOrganizationId: 'org_1',
        createdBy: 'usr_1',
      }
    )
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%20%2F1/request-forms/form%20%2F2/submissions',
      })
    )
    expect(result.data?.formId).toBe('crm_form_1')
    expect(result.error).toBeNull()
    expect(result.data?.object).toBe('request_form_submission')
  })

  it('includes answers and createdBy in body', async () => {
    mockSend.mockResolvedValue(json(submission))
    const input = {
      answers: { subject: 'Need help', details: 'Broken' },
      customerOrganizationId: 'org_1',
      createdBy: 'usr_1',
    }
    await client.requestFormSubmissions.create('org_1', 'form_1', input)
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ body: input })
    )
  })

  it('sends with customerUserId alternative party', async () => {
    mockSend.mockResolvedValue(json(submission))
    await client.requestFormSubmissions.create('org_1', 'form_1', {
      answers: { subject: 'Hi' },
      customerUserId: 'usr_99',
      createdBy: 'usr_1',
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: expect.objectContaining({ customerUserId: 'usr_99' }),
      })
    )
  })

  it('includes optional requesterUserId and requesterContactId when provided', async () => {
    mockSend.mockResolvedValue(json(submission))
    await client.requestFormSubmissions.create('org_1', 'form_1', {
      answers: { subject: 'Hi' },
      customerOrganizationId: 'org_2',
      requesterUserId: 'usr_2',
      requesterContactId: 'contact_1',
      createdBy: 'usr_1',
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: expect.objectContaining({
          requesterUserId: 'usr_2',
          requesterContactId: 'contact_1',
        }),
      })
    )
  })

  it('forwards AbortSignal on create', async () => {
    mockSend.mockResolvedValue(json(submission))
    const c = new AbortController()
    await client.requestFormSubmissions.create(
      'org_1',
      'form_1',
      {
        answers: { subject: 'Hi' },
        customerOrganizationId: 'org_1',
        createdBy: 'usr_1',
      },
      { signal: c.signal }
    )
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: c.signal })
    )
  })

  it('returns invalid-response when payload malformed', async () => {
    mockSend.mockResolvedValue(malformed())
    const result = await client.requestFormSubmissions.create(
      'org_1',
      'form_1',
      {
        answers: { subject: 'Hi' },
        customerOrganizationId: 'org_1',
        createdBy: 'usr_1',
      }
    )
    expect(result).toEqual({
      data: null,
      error: { code: 'crm/invalid-response', message: expect.any(String) },
    })
  })

  it('propagates form-not-published error', async () => {
    mockSend.mockResolvedValue(
      errorPayload('crm/form-not-published', 'not accepting')
    )
    const result = await client.requestFormSubmissions.create(
      'org_1',
      'form_1',
      {
        answers: { subject: 'Hi' },
        customerOrganizationId: 'org_1',
        createdBy: 'usr_1',
      }
    )
    expect(result).toEqual({
      data: null,
      error: { code: 'crm/form-not-published', message: 'not accepting' },
    })
  })

  it('propagates form-invalid-submission error', async () => {
    mockSend.mockResolvedValue(
      errorPayload('crm/form-invalid-submission', 'invalid')
    )
    const result = await client.requestFormSubmissions.create(
      'org_1',
      'form_1',
      {
        answers: { subject: '' },
        customerOrganizationId: 'org_1',
        createdBy: 'usr_1',
      }
    )
    expect(result.error?.code).toBe('crm/form-invalid-submission')
    expect(result.data).toBeNull()
  })

  it('fails closed when not configured', async () => {
    const unconfigured = create876CrmClient({
      baseUrl: 'http://crm.test',
      fetch: vi.fn() as unknown as typeof fetch,
    })
    const result = await unconfigured.requestFormSubmissions.create(
      'org_1',
      'form_1',
      {
        answers: { subject: 'Hi' },
        customerOrganizationId: 'org_1',
        createdBy: 'usr_1',
      }
    )
    expect(result.error?.code).toBe('crm/not-configured')
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('handles all field-type answers without mangling', async () => {
    mockSend.mockResolvedValue(json(submission))
    await client.requestFormSubmissions.create('org_1', 'form_1', {
      answers: {
        subject: 'Hi',
        count: 42,
        agree: true,
        tags: ['a', 'b'],
        email: 'a@b.com',
        date: '2026-08-26',
        phone: '+12065550100',
      },
      customerOrganizationId: 'org_1',
      createdBy: 'usr_1',
    })
    const body = mockSend.mock.calls[0][1].body as Record<string, unknown>
    expect((body.answers as Record<string, unknown>).count).toBe(42)
  })
})

describe('requestFormSubmissions - list', () => {
  it('requests GET at form-scoped submissions URL', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [record],
        has_more: false,
        total_count: 1,
        url: '/x',
      })
    )
    const result = await client.requestFormSubmissions.list('org_1', 'form_1')
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'GET',
        path: '/v1/organizations/org_1/request-forms/form_1/submissions',
      })
    )
    expect(result.data?.data).toHaveLength(1)
    expect(result.data?.data[0].id).toBe('sub_1')
    expect(result.error).toBeNull()
  })

  it('encodes organization and form ids on list', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/x',
      })
    )
    await client.requestFormSubmissions.list('org /1', 'form /2')
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: '/v1/organizations/org%20%2F1/request-forms/form%20%2F2/submissions',
      })
    )
  })

  it('forwards signal on list', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/x',
      })
    )
    const c = new AbortController()
    await client.requestFormSubmissions.list('org_1', 'form_1', {
      signal: c.signal,
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: c.signal })
    )
  })

  it('returns invalid-response when list payload is malformed', async () => {
    mockSend.mockResolvedValue(malformed())
    const result = await client.requestFormSubmissions.list('org_1', 'form_1')
    expect(result.error?.code).toBe('crm/invalid-response')
  })

  it('propagates envelope error on list', async () => {
    mockSend.mockResolvedValue(errorPayload('crm/form-not-found', 'not found'))
    const result = await client.requestFormSubmissions.list('org_1', 'form_1')
    expect(result).toEqual({
      data: null,
      error: { code: 'crm/form-not-found', message: 'not found' },
    })
  })

  it('fails closed on list when not configured', async () => {
    const unconfigured = create876CrmClient({
      baseUrl: 'http://crm.test',
      fetch: vi.fn() as unknown as typeof fetch,
    })
    const result = await unconfigured.requestFormSubmissions.list(
      'org_1',
      'form_1'
    )
    expect(result.error?.code).toBe('crm/not-configured')
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('asserts complete list shape with has_more, total_count, url', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [record],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/request-forms/form_1/submissions',
      })
    )
    const result = await client.requestFormSubmissions.list('org_1', 'form_1')
    expect(result.data).toEqual({
      object: 'list',
      data: [record],
      has_more: false,
      total_count: 1,
      url: '/v1/organizations/org_1/request-forms/form_1/submissions',
    })
    expect(result.error).toBeNull()
  })
})
