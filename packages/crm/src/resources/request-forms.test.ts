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

const priority = {
  object: 'request_priority' as const,
  id: 'crm_pri_normal',
  tenantId: 'crm_tenant_1',
  provisioningKey: 'normal',
  name: 'Normal',
  slug: 'normal',
  description: null,
  color: null,
  icon: null,
  weight: 20,
  sortOrder: 20,
  isDefault: true,
  isActive: true,
  createdBy: null,
  createdAt: 1,
  updatedAt: 1,
}

const form = {
  object: 'request_form' as const,
  id: 'crm_form_1',
  tenantId: 'crm_tenant_1',
  name: 'Support Intake',
  slug: 'support-intake',
  description: null,
  status: 'PUBLISHED' as const,
  placement: 'HOSTED' as const,
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
  defaultPriorityId: priority.id,
  confirmationTitle: null,
  confirmationMessage: null,
  createdBy: 'usr_1',
  publishedAt: 1,
  createdAt: 1,
  updatedAt: 1,
}

const requestResource = {
  object: 'request' as const,
  id: 'crm_req_1',
  tenantId: 'crm_tenant_1',
  customerId: 'crm_cus_1',
  number: 1,
  subject: 'Need help',
  categoryId: null,
  subcategoryId: null,
  status: 'OPEN' as const,
  priorityId: priority.id,
  priority,
  channel: 'FORM' as const,
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
}

const client = create876CrmClient({
  baseUrl: 'http://crm.test',
  internalKey: 'crm-internal',
  fetch: vi.fn() as unknown as typeof fetch,
})

beforeEach(() => vi.clearAllMocks())

describe('requestForms', () => {
  it('lists forms at the organization-scoped path', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [form],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/request-forms',
      })
    )

    const result = await client.requestForms.list('org_1')

    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'GET',
        path: '/v1/organizations/org_1/request-forms',
      })
    )
    expect(result.data?.data[0]?.defaultPriorityId).toBe(priority.id)
  })

  it('appends status filters and encodes organization IDs', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/x',
      })
    )

    await client.requestForms.list('org /north', { status: 'PUBLISHED' })

    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: '/v1/organizations/org%20%2Fnorth/request-forms?status=PUBLISHED',
      })
    )
  })

  it('forwards AbortSignal on list and retrieve', async () => {
    const controller = new AbortController()
    mockSend
      .mockResolvedValueOnce(
        json({
          object: 'list',
          data: [],
          has_more: false,
          total_count: 0,
          url: '/x',
        })
      )
      .mockResolvedValueOnce(json(form))

    await client.requestForms.list('org_1', { signal: controller.signal })
    await client.requestForms.retrieve('org_1', 'crm_form_1', {
      signal: controller.signal,
    })

    expect(mockSend.mock.calls[0]?.[1]).toMatchObject({
      signal: controller.signal,
    })
    expect(mockSend.mock.calls[1]?.[1]).toMatchObject({
      signal: controller.signal,
    })
  })

  it('retrieves a form with encoded IDs', async () => {
    mockSend.mockResolvedValue(json(form))

    const result = await client.requestForms.retrieve('org /north', 'form /1')

    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'GET',
        path: '/v1/organizations/org%20%2Fnorth/request-forms/form%20%2F1',
      })
    )
    expect(result.data?.id).toBe(form.id)
  })

  it('creates a form with defaultPriorityId rather than the removed enum field', async () => {
    mockSend.mockResolvedValue(json(form))
    const input = {
      name: 'Support Intake',
      slug: 'support-intake',
      definition: form.definition,
      defaultPriorityId: priority.id,
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
    expect(result.data?.defaultPriorityId).toBe(priority.id)
  })

  it('updates and publishes a form without resending the full definition', async () => {
    mockSend.mockResolvedValue(json({ ...form, version: 2 }))

    const result = await client.requestForms.update('org_1', form.id, {
      status: 'PUBLISHED',
      defaultPriorityId: priority.id,
      updatedBy: 'usr_2',
    })

    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'PATCH',
        path: `/v1/organizations/org_1/request-forms/${form.id}`,
        body: {
          status: 'PUBLISHED',
          defaultPriorityId: priority.id,
          updatedBy: 'usr_2',
        },
      })
    )
    expect(result.data?.version).toBe(2)
  })

  it('deletes a form with attribution and reason', async () => {
    mockSend.mockResolvedValue(
      json({ object: 'request_form', id: form.id, deleted: true })
    )

    const result = await client.requestForms.delete('org_1', form.id, {
      deletedBy: 'usr_1',
      reason: 'No longer used',
    })

    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'DELETE',
        body: { deletedBy: 'usr_1', reason: 'No longer used' },
      })
    )
    expect(result.data?.deleted).toBe(true)
  })

  it('returns invalid-response for malformed form payloads', async () => {
    mockSend.mockResolvedValue(json({ object: 'request_form', id: 'bad' }))

    const result = await client.requestForms.retrieve('org_1', 'bad')

    expect(result.error?.code).toBe('crm/invalid-response')
    expect(result.data).toBeNull()
  })

  it('propagates CRM envelope errors', async () => {
    mockSend.mockResolvedValue(
      errorPayload('crm/form-not-found', 'Form not found.')
    )

    const result = await client.requestForms.retrieve('org_1', 'missing')

    expect(result).toEqual({
      data: null,
      error: { code: 'crm/form-not-found', message: 'Form not found.' },
    })
  })

  it('propagates network failures', async () => {
    mockSend.mockResolvedValue(networkError())

    const result = await client.requestForms.retrieve('org_1', form.id)

    expect(result.error?.code).toBe('network/offline')
  })

  it('fails closed when the CRM internal credential is missing', async () => {
    const unconfigured = create876CrmClient({
      baseUrl: 'http://crm.test',
      fetch: vi.fn() as unknown as typeof fetch,
    })

    const result = await unconfigured.requestForms.list('org_1')

    expect(result.error?.code).toBe('crm/not-configured')
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('returns invalid-response for malformed envelopes', async () => {
    mockSend.mockResolvedValue(malformed())

    const result = await client.requestForms.list('org_1')

    expect(result.error?.code).toBe('crm/invalid-response')
  })
})

describe('requestFormSubmissions', () => {
  const submission = {
    object: 'request_form_submission' as const,
    id: 'crm_sub_1',
    formId: form.id,
    formVersion: 1,
    request: requestResource,
    createdAt: 2,
  }

  it('creates a submission and validates the embedded priority resource', async () => {
    mockSend.mockResolvedValue(json(submission))
    const input = {
      answers: { subject: 'Need help', details: 'Please call me.' },
      customerOrganizationId: 'customer_org_1',
      createdBy: 'usr_1',
    }

    const result = await client.requestFormSubmissions.create(
      'org_1',
      form.id,
      input
    )

    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: `/v1/organizations/org_1/request-forms/${form.id}/submissions`,
        body: input,
      })
    )
    expect(result.data?.request.priority.id).toBe(priority.id)
  })

  it('lists stored submission records', async () => {
    const record = {
      object: 'request_form_submission_record' as const,
      id: 'crm_sub_1',
      formId: form.id,
      requestId: requestResource.id,
      formVersion: 1,
      definitionSnapshot: form.publishedDefinition,
      answers: { subject: 'Need help' },
      customerOrganizationId: 'customer_org_1',
      customerUserId: null,
      requesterUserId: null,
      requesterContactId: null,
      createdBy: 'usr_1',
      createdAt: 2,
    }
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [record],
        has_more: false,
        total_count: 1,
        url: `/v1/organizations/org_1/request-forms/${form.id}/submissions`,
      })
    )

    const result = await client.requestFormSubmissions.list('org_1', form.id)

    expect(result.data?.data[0]?.requestId).toBe(requestResource.id)
  })
})

describe('requestFormRequests', () => {
  it('lists customer requests through the form-scoped endpoint', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [requestResource],
        has_more: false,
        total_count: 1,
        url: `/v1/organizations/org_1/request-forms/${form.id}/requests`,
      })
    )

    const result = await client.requestFormRequests.list('org_1', form.id, {
      customerOrganizationId: 'customer/org',
    })

    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'GET',
        path: `/v1/organizations/org_1/request-forms/${form.id}/requests?customerOrganizationId=customer%2Forg`,
      })
    )
    expect(result.data?.data[0]?.priorityId).toBe(priority.id)
  })

  it('supports customer user filters and AbortSignal', async () => {
    const controller = new AbortController()
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/x',
      })
    )

    await client.requestFormRequests.list('org /north', 'form /1', {
      customerUserId: 'user /1',
      signal: controller.signal,
    })

    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: '/v1/organizations/org%20%2Fnorth/request-forms/form%20%2F1/requests?customerUserId=user+%2F1',
        signal: controller.signal,
      })
    )
  })
})
