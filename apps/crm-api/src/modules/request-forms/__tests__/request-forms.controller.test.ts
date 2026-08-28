import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'

const { service } = vi.hoisted(() => ({
  service: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    submit: vi.fn(),
    listCustomerRequests: vi.fn(),
    listSubmissions: vi.fn(),
  },
}))
vi.mock('../request-forms.service.js', () => service)

import * as controller from '../request-forms.controller.js'

function mockResponse() {
  const json = vi.fn()
  const status = vi.fn().mockReturnValue({ json })
  return {
    json,
    status,
    _json: json,
    _status: status,
  } as unknown as Response & {
    json: typeof json
    status: typeof status
    _json: typeof json
    _status: typeof status
  }
}

const definition = {
  fields: [
    {
      id: 'f1',
      key: 'subject',
      type: 'TEXT' as const,
      label: 'Subject',
      required: true,
      mapping: 'REQUEST_SUBJECT' as const,
    },
    {
      id: 'f2',
      key: 'details',
      type: 'LONG_TEXT' as const,
      label: 'Details',
      required: false,
      mapping: 'REQUEST_DESCRIPTION' as const,
    },
  ],
}
const form = {
  object: 'request_form' as const,
  id: 'crm_form_1',
  tenantId: 'crm_tenant_1',
  name: 'Support',
  slug: 'support',
  description: null,
  status: 'PUBLISHED' as const,
  definition,
  publishedDefinition: definition,
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

beforeEach(() => vi.clearAllMocks())

describe('request-forms.controller - listRequestForms', () => {
  it('returns 200 with list envelope and delegates to service', async () => {
    // ARRANGE
    service.list.mockResolvedValue([form])
    const req = {
      params: { organizationId: 'org_1' },
      query: {},
    } as unknown as Request
    const res = mockResponse()
    // ACT
    await controller.listRequestForms(req, res)
    // ASSERT
    expect(service.list).toHaveBeenCalledTimes(1)
    expect(service.list).toHaveBeenCalledWith('org_1', undefined)
    expect(res.json).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledWith({
      data: {
        object: 'list',
        data: [form],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/request-forms',
      },
      error: null,
    })
    expect(res.status).not.toHaveBeenCalled()
  })

  it('passes status filter from query', async () => {
    service.list.mockResolvedValue([])
    const req = {
      params: { organizationId: 'org_1' },
      query: { status: 'PUBLISHED' },
    } as unknown as Request
    const res = mockResponse()
    await controller.listRequestForms(req, res)
    expect(service.list).toHaveBeenCalledWith('org_1', 'PUBLISHED')
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ total_count: 0 }),
      })
    )
  })

  it('trims organizationId via schema', async () => {
    service.list.mockResolvedValue([])
    const req = {
      params: { organizationId: '  org_1  ' },
      query: {},
    } as unknown as Request
    const res = mockResponse()
    await controller.listRequestForms(req, res)
    expect(service.list).toHaveBeenCalledWith('org_1', undefined)
  })
})

describe('request-forms.controller - retrieveRequestForm', () => {
  it('returns 200 with form when found', async () => {
    service.retrieve.mockResolvedValue(form)
    const req = {
      params: { organizationId: 'org_1', id: 'crm_form_1' },
    } as unknown as Request
    const res = mockResponse()
    await controller.retrieveRequestForm(req, res)
    expect(service.retrieve).toHaveBeenCalledWith('org_1', 'crm_form_1')
    expect(res.json).toHaveBeenCalledWith({ data: form, error: null })
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 404 when form not found', async () => {
    service.retrieve.mockResolvedValue(null)
    const req = {
      params: { organizationId: 'org_1', id: 'missing' },
    } as unknown as Request
    const res = mockResponse()
    await controller.retrieveRequestForm(req, res)
    expect(service.retrieve).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.status(404).json).toHaveBeenCalledWith({
      data: null,
      error: { code: 'crm/form-not-found', message: 'Request form not found.' },
    })
  })
})

describe('request-forms.controller - createRequestForm', () => {
  it('returns 201 with created form', async () => {
    service.create.mockResolvedValue(form)
    const req = {
      params: { organizationId: 'org_1' },
      body: {
        name: 'Support',
        slug: 'support',
        definition,
        createdBy: 'usr_1',
      },
    } as unknown as Request
    const res = mockResponse()
    await controller.createRequestForm(req, res)
    expect(service.create).toHaveBeenCalledWith('org_1', {
      name: 'Support',
      slug: 'support',
      definition,
      createdBy: 'usr_1',
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.status(201).json).toHaveBeenCalledWith({
      data: form,
      error: null,
    })
  })

  it('trims organizationId', async () => {
    service.create.mockResolvedValue(form)
    const req = {
      params: { organizationId: '  org_1  ' },
      body: { name: 'x', slug: 'x', definition, createdBy: 'usr_1' },
    } as unknown as Request
    const res = mockResponse()
    await controller.createRequestForm(req, res)
    expect(service.create).toHaveBeenCalledWith('org_1', expect.anything())
  })
})

describe('request-forms.controller - updateRequestForm', () => {
  it('returns 200 with updated form', async () => {
    service.update.mockResolvedValue({ ...form, name: 'Renamed' })
    const req = {
      params: { organizationId: 'org_1', id: 'crm_form_1' },
      body: { name: 'Renamed', updatedBy: 'usr_1' },
    } as unknown as Request
    const res = mockResponse()
    await controller.updateRequestForm(req, res)
    expect(service.update).toHaveBeenCalledWith('org_1', 'crm_form_1', {
      name: 'Renamed',
      updatedBy: 'usr_1',
    })
    expect(res.json).toHaveBeenCalledWith({
      data: { ...form, name: 'Renamed' },
      error: null,
    })
  })

  it('returns 404 when form to update not found', async () => {
    service.update.mockResolvedValue(null)
    const req = {
      params: { organizationId: 'org_1', id: 'missing' },
      body: { updatedBy: 'usr_1' },
    } as unknown as Request
    const res = mockResponse()
    await controller.updateRequestForm(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.status(404).json).toHaveBeenCalledWith({
      data: null,
      error: { code: 'crm/form-not-found', message: expect.any(String) },
    })
  })
})

describe('request-forms.controller - deleteRequestForm', () => {
  it('returns 200 with deleted marker', async () => {
    const deleted = {
      object: 'request_form' as const,
      id: 'crm_form_1',
      deleted: true as const,
    }
    service.remove.mockResolvedValue(deleted)
    const req = {
      params: { organizationId: 'org_1', id: 'crm_form_1' },
      body: { deletedBy: 'usr_1', reason: 'outdated' },
    } as unknown as Request
    const res = mockResponse()
    await controller.deleteRequestForm(req, res)
    expect(service.remove).toHaveBeenCalledWith('org_1', 'crm_form_1', {
      deletedBy: 'usr_1',
      reason: 'outdated',
    })
    expect(res.json).toHaveBeenCalledWith({ data: deleted, error: null })
  })

  it('returns 404 when form to delete not found', async () => {
    service.remove.mockResolvedValue(null)
    const req = {
      params: { organizationId: 'org_1', id: 'missing' },
      body: { deletedBy: 'usr_1' },
    } as unknown as Request
    const res = mockResponse()
    await controller.deleteRequestForm(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('passes null reason correctly', async () => {
    service.remove.mockResolvedValue({
      object: 'request_form',
      id: 'crm_form_1',
      deleted: true,
    })
    const req = {
      params: { organizationId: 'org_1', id: 'crm_form_1' },
      body: { deletedBy: 'usr_1', reason: null },
    } as unknown as Request
    const res = mockResponse()
    await controller.deleteRequestForm(req, res)
    expect(service.remove).toHaveBeenCalledWith('org_1', 'crm_form_1', {
      deletedBy: 'usr_1',
      reason: null,
    })
  })
})

describe('request-forms.controller - submitRequestForm', () => {
  it('returns 201 with submission', async () => {
    const submission = {
      object: 'request_form_submission' as const,
      id: 'sub_1',
      formId: 'crm_form_1',
      formVersion: 1,
      request: { object: 'request' as const, id: 'req_1' },
      createdAt: 1,
    }
    service.submit.mockResolvedValue(submission)
    const req = {
      params: { organizationId: 'org_1', id: 'crm_form_1' },
      body: {
        answers: { subject: 'Hi' },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      },
    } as unknown as Request
    const res = mockResponse()
    await controller.submitRequestForm(req, res)
    expect(service.submit).toHaveBeenCalledWith('org_1', 'crm_form_1', {
      answers: { subject: 'Hi' },
      customerOrganizationId: 'org_2',
      createdBy: 'usr_1',
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.status(201).json).toHaveBeenCalledWith({
      data: submission,
      error: null,
    })
  })
})

describe('request-forms.controller - listFormCustomerRequests', () => {
  it('returns 200 with customer-scoped request list', async () => {
    const reqRow = { object: 'request' as const, id: 'crm_req_1' }
    service.listCustomerRequests.mockResolvedValue([reqRow])
    const req = {
      params: { organizationId: 'org_1', id: 'crm_form_1' },
      query: { customerOrganizationId: 'org_2' },
    } as unknown as Request
    const res = mockResponse()
    await controller.listFormCustomerRequests(req, res)
    expect(service.listCustomerRequests).toHaveBeenCalledWith(
      'org_1',
      'crm_form_1',
      { customerOrganizationId: 'org_2' }
    )
    expect(res.json).toHaveBeenCalledWith({
      data: {
        object: 'list',
        data: [reqRow],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/request-forms/crm_form_1/requests',
      },
      error: null,
    })
  })

  it('supports customerUserId filter', async () => {
    service.listCustomerRequests.mockResolvedValue([])
    const req = {
      params: { organizationId: 'org_1', id: 'form_1' },
      query: { customerUserId: 'usr_1' },
    } as unknown as Request
    const res = mockResponse()
    await controller.listFormCustomerRequests(req, res)
    expect(service.listCustomerRequests).toHaveBeenCalledWith(
      'org_1',
      'form_1',
      { customerUserId: 'usr_1' }
    )
  })
})

describe('request-forms.controller - listRequestFormSubmissions', () => {
  it('returns 200 with submission records list', async () => {
    const record = {
      object: 'request_form_submission_record' as const,
      id: 'sub_1',
      formId: 'form_1',
      requestId: 'req_1',
      formVersion: 1,
      definitionSnapshot: {},
      answers: {},
      customerOrganizationId: null,
      customerUserId: null,
      requesterUserId: null,
      requesterContactId: null,
      createdBy: 'usr_1',
      createdAt: 1,
    }
    service.listSubmissions.mockResolvedValue([record])
    const req = {
      params: { organizationId: 'org_1', id: 'form_1' },
    } as unknown as Request
    const res = mockResponse()
    await controller.listRequestFormSubmissions(req, res)
    expect(service.listSubmissions).toHaveBeenCalledWith('org_1', 'form_1')
    expect(res.json).toHaveBeenCalledWith({
      data: {
        object: 'list',
        data: [record],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/request-forms/form_1/submissions',
      },
      error: null,
    })
  })

  it('returns 200 with empty list when no submissions', async () => {
    service.listSubmissions.mockResolvedValue([])
    const req = {
      params: { organizationId: 'org_1', id: 'form_1' },
    } as unknown as Request
    const res = mockResponse()
    await controller.listRequestFormSubmissions(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ total_count: 0 }),
      })
    )
  })
})
