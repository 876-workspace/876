import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  createBillingIntegration: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/clients/billing', () => ({
  createBillingIntegration: mocks.createBillingIntegration,
}))

import { GET, POST } from './route'

function postRequest(body: unknown) {
  return new Request(
    'http://couriers.test/api/manage/finance/document-templates',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
}

function getRequest(query: string) {
  return new Request(
    `http://couriers.test/api/manage/finance/document-templates${query}`,
    { method: 'GET' }
  )
}

function context(role: 'admin' | 'staff' = 'admin') {
  return {
    role,
    userId: 'usr_1',
    orgId: 'org_1',
    orgName: 'Acme',
    orgSlug: 'acme',
    orgLogoUrl: null,
    organizations: [],
    tenant: null,
    accessStatus: 'active' as const,
  }
}

const template = {
  object: 'document-template' as const,
  id: 'dtpl_1',
  documentType: 'invoice' as const,
  name: 'Invoice template',
  layout: 'standard' as const,
  isDefault: false,
  settings: {},
  resolvedSettings: {},
  createdAt: 1,
  updatedAt: 1,
}
const templateList = {
  object: 'list' as const,
  data: [template],
  has_more: false,
  total_count: 1,
  url: '/api/v1/integrations/organizations/org_1/document-templates',
}

const validBody = {
  orgSlug: 'acme',
  documentType: 'invoice',
  name: 'Invoice template',
  layout: 'standard',
  settings: {},
}

describe('Couriers document template collection route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(context())
    mocks.createBillingIntegration.mockReturnValue({
      documentTemplates: { list: mocks.list, create: mocks.create },
    })
    mocks.list.mockResolvedValue({ data: templateList, error: null })
    mocks.create.mockResolvedValue({ data: template, error: null })
  })

  it('returns 403 without calling Billing when listing as staff', async () => {
    mocks.getManageContext.mockResolvedValue(context('staff'))

    const response = await GET(getRequest('?orgSlug=acme&documentType=invoice'))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'finance/forbidden',
        message: 'You do not have permission to manage finance settings.',
      },
    })
    expect(mocks.createBillingIntegration).not.toHaveBeenCalled()
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('lists with the exact organization id and document type', async () => {
    const response = await GET(getRequest('?orgSlug=acme&documentType=invoice'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: templateList, error: null })
    expect(mocks.list).toHaveBeenCalledWith('org_1', {
      documentType: 'invoice',
    })
  })

  it('lists without a type filter when documentType is absent', async () => {
    const response = await GET(getRequest('?orgSlug=acme'))

    expect(response.status).toBe(200)
    expect(mocks.list).toHaveBeenCalledWith('org_1', {})
  })

  it('returns 422 when the list query is missing orgSlug', async () => {
    const response = await GET(getRequest('?documentType=invoice'))

    expect(response.status).toBe(422)
    expect((await response.json()).error.code).toBe(
      'finance/invalid-document-template'
    )
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('returns 403 without calling Billing when creating as staff', async () => {
    mocks.getManageContext.mockResolvedValue(context('staff'))

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'finance/forbidden',
        message: 'You do not have permission to manage finance settings.',
      },
    })
    expect(mocks.createBillingIntegration).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns a success envelope when creating a template', async () => {
    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ data: template, error: null })
    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      documentType: 'invoice',
      name: 'Invoice template',
      layout: 'standard',
      settings: {},
    })
  })

  it('returns 422 when the create body has an unknown layout', async () => {
    const response = await POST(
      postRequest({ ...validBody, layout: 'comic-sans' })
    )

    expect(response.status).toBe(422)
    expect((await response.json()).error.code).toBe(
      'finance/invalid-document-template'
    )
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('passes a registered Billing error value through unchanged', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'billing/workspace-not-found', message: 'internal text' },
    })

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'billing/workspace-not-found',
        message: 'The Billing workspace was not found.',
      },
    })
  })

  it('normalizes an unrecognized Billing failure to the template error', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'provider/weird', message: 'internal text' },
    })

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(502)
    expect((await response.json()).error.code).toBe(
      'finance/document-template-unavailable'
    )
  })
})
