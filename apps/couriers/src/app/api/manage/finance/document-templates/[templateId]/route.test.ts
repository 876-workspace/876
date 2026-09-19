import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  createBillingIntegration: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/clients/billing', () => ({
  createBillingIntegration: mocks.createBillingIntegration,
}))

import { DELETE, PATCH } from './route'

const params = Promise.resolve({ templateId: 'dtpl_1' })
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

function request(body: unknown, method = 'PATCH') {
  return new Request(
    'http://couriers.test/api/manage/finance/document-templates/dtpl_1',
    {
      method,
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

describe('Couriers document template resource route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(context())
    mocks.createBillingIntegration.mockReturnValue({
      documentTemplates: { update: mocks.update, delete: mocks.remove },
    })
    mocks.update.mockResolvedValue({ data: template, error: null })
    mocks.remove.mockResolvedValue({
      data: { object: 'document-template', id: 'dtpl_1', deleted: true },
      error: null,
    })
  })

  it('returns 403 without calling Billing when updating as staff', async () => {
    mocks.getManageContext.mockResolvedValue(context('staff'))

    const response = await PATCH(
      request({ orgSlug: 'acme', name: 'Updated' }),
      { params }
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'finance/forbidden',
        message: 'You do not have permission to manage finance settings.',
      },
    })
    expect(mocks.createBillingIntegration).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('returns a success envelope when updating a template', async () => {
    const response = await PATCH(
      request({ orgSlug: 'acme', name: 'Updated', layout: 'elegant' }),
      { params }
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: template, error: null })
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'dtpl_1', {
      name: 'Updated',
      layout: 'elegant',
    })
  })

  it('returns 422 when the update body carries an unknown setting', async () => {
    const response = await PATCH(
      request({ orgSlug: 'acme', settings: { header: { noSuchField: true } } }),
      { params }
    )

    expect(response.status).toBe(422)
    expect((await response.json()).error.code).toBe(
      'finance/invalid-document-template'
    )
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('returns 403 without calling Billing when deleting as staff', async () => {
    mocks.getManageContext.mockResolvedValue(context('staff'))

    const response = await DELETE(request({ orgSlug: 'acme' }, 'DELETE'), {
      params,
    })

    expect(response.status).toBe(403)
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('deletes with the exact organization and template ids', async () => {
    const response = await DELETE(request({ orgSlug: 'acme' }, 'DELETE'), {
      params,
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: { object: 'document-template', id: 'dtpl_1', deleted: true },
      error: null,
    })
    expect(mocks.remove).toHaveBeenCalledWith('org_1', 'dtpl_1')
  })
})
