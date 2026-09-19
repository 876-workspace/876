import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  createBillingIntegration: vi.fn(),
  setDefault: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/clients/billing', () => ({
  createBillingIntegration: mocks.createBillingIntegration,
}))

import { POST } from './route'

const params = Promise.resolve({ templateId: 'dtpl_1' })
const template = {
  object: 'document-template' as const,
  id: 'dtpl_1',
  documentType: 'invoice' as const,
  name: 'Invoice template',
  layout: 'standard' as const,
  isDefault: true,
  settings: {},
  resolvedSettings: {},
  createdAt: 1,
  updatedAt: 1,
}

function request(body: unknown) {
  return new Request(
    'http://couriers.test/api/manage/finance/document-templates/dtpl_1/default',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }
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

describe('Couriers document template set-default route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(context())
    mocks.createBillingIntegration.mockReturnValue({
      documentTemplates: { setDefault: mocks.setDefault },
    })
    mocks.setDefault.mockResolvedValue({ data: template, error: null })
  })

  it('returns 403 without calling Billing when the caller is staff', async () => {
    mocks.getManageContext.mockResolvedValue(context('staff'))

    const response = await POST(request({ orgSlug: 'acme' }), { params })

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'finance/forbidden',
        message: 'You do not have permission to manage finance settings.',
      },
    })
    expect(mocks.createBillingIntegration).not.toHaveBeenCalled()
    expect(mocks.setDefault).not.toHaveBeenCalled()
  })

  it('sets the default with the exact organization and template ids', async () => {
    const response = await POST(request({ orgSlug: 'acme' }), { params })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: template, error: null })
    expect(mocks.setDefault).toHaveBeenCalledWith('org_1', 'dtpl_1')
  })

  it('returns 422 when the body is missing orgSlug', async () => {
    const response = await POST(request({}), { params })

    expect(response.status).toBe(422)
    expect((await response.json()).error.code).toBe(
      'finance/invalid-document-template'
    )
    expect(mocks.setDefault).not.toHaveBeenCalled()
  })
})
