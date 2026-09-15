import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  activeConnection: vi.fn(),
  appForApiKey: vi.fn(),
  effectiveMember: vi.fn(),
  introspect: vi.fn(),
  organizationMembership: vi.fn(),
  tenantByOrganizationId: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
  resolve: vi.fn(),
  retrieve: vi.fn(),
  retrieveBranding: vi.fn(),
  setDefault: vi.fn(),
  update: vi.fn(),
  updateBranding: vi.fn(),
}))

vi.mock('@/modules/tenants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/tenants')>()),
  tenantAuthorizationByOrganizationId: mocks.tenantByOrganizationId,
}))
vi.mock('@/modules/access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/access')>()),
  effectiveMemberAuthorization: mocks.effectiveMember,
}))
vi.mock('@/modules/finance-connections', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/finance-connections')>()),
  activeConnectionAuthorization: mocks.activeConnection,
}))
vi.mock('@/providers/identity', () => ({
  HttpIdentityGateway: class {
    appForApiKey = mocks.appForApiKey
    introspect = mocks.introspect
    organizationMembership = mocks.organizationMembership
  },
}))
vi.mock('./document-templates.service', () => ({
  documentTemplatesService: {
    create: mocks.create,
    delete: mocks.delete,
    list: mocks.list,
    resolve: mocks.resolve,
    retrieve: mocks.retrieve,
    retrieveBranding: mocks.retrieveBranding,
    setDefault: mocks.setDefault,
    update: mocks.update,
    updateBranding: mocks.updateBranding,
  },
}))

import { createApp } from '@/application'
import { resetSettingsForTest } from '@/config'
import { appError } from '@/http/errors'

const base = '/api/v1/document-templates'
const integrationBase =
  '/api/v1/integrations/organizations/org_1/document-templates'
const template = { object: 'document-template', id: 'dtpl_1' }
const list = {
  object: 'list',
  data: [template],
  has_more: false,
  total_count: 1,
  url: base,
}
const branding = {
  object: 'branding',
  accentColor: '#2563eb',
  appearance: 'system',
  sidebarTone: 'light',
  updatedAt: null,
}

function tenantCall(call: request.Test) {
  return call
    .set('authorization', 'Bearer access-token')
    .set('x-billing-organization-id', 'org_1')
}

function integrationCall(call: request.Test) {
  return call.set('x-876-api-key', '876_app_secret_invoice')
}

describe('document template routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BILLING_WRITER = 'express'
    resetSettingsForTest(process.env)
    mocks.tenantByOrganizationId.mockResolvedValue({
      id: 'ten_1',
      active: true,
    })
    mocks.effectiveMember.mockResolvedValue({
      permissions: new Set(['sales:read', 'sales:write']),
    })
    mocks.introspect.mockResolvedValue({
      active: true,
      subject: 'user_1',
      appId: null,
      scopes: new Set(),
    })
    mocks.organizationMembership.mockResolvedValue({ role: 'admin' })
    mocks.activeConnection.mockResolvedValue({
      scopes: new Set(['billing.invoices.read', 'billing.invoices.write']),
    })
    mocks.appForApiKey.mockResolvedValue({ id: 'app_invoice' })
    mocks.list.mockResolvedValue(list)
    mocks.create.mockResolvedValue(template)
    mocks.retrieve.mockResolvedValue(template)
    mocks.update.mockResolvedValue(template)
    mocks.setDefault.mockResolvedValue(template)
    mocks.delete.mockResolvedValue({
      object: 'document-template',
      id: 'dtpl_1',
      deleted: true,
    })
    mocks.resolve.mockResolvedValue({
      object: 'resolved-document-template',
      documentType: 'invoice',
      templateId: null,
      name: null,
      layout: 'standard',
      settings: {},
      branding,
    })
    mocks.retrieveBranding.mockResolvedValue(branding)
    mocks.updateBranding.mockResolvedValue(branding)
  })

  it('rejects an unauthenticated tenant list', async () => {
    const response = await request(createApp())
      .get(base)
      .set('x-billing-organization-id', 'org_1')
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/missing-credential')
  })

  it('requires sales:read to list tenant templates', async () => {
    mocks.effectiveMember.mockResolvedValue({ permissions: new Set() })
    const response = await tenantCall(request(createApp()).get(base))
    expect(response.status).toBe(403)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('lists tenant templates with a document type filter', async () => {
    const response = await tenantCall(
      request(createApp()).get(`${base}?documentType=invoice`)
    )
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: list, error: null })
    expect(mocks.list).toHaveBeenCalledWith('ten_1', 'invoice')
  })

  it('requires sales:write to create templates', async () => {
    mocks.effectiveMember.mockResolvedValue({
      permissions: new Set(['sales:read']),
    })
    const response = await tenantCall(request(createApp()).post(base)).send({
      documentType: 'invoice',
      name: 'Invoice',
      layout: 'standard',
    })
    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects unknown create body keys strictly', async () => {
    const response = await tenantCall(request(createApp()).post(base)).send({
      documentType: 'invoice',
      name: 'Invoice',
      layout: 'standard',
      unknown: true,
    })
    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('creates a tenant template with the document-template discriminator', async () => {
    const response = await tenantCall(request(createApp()).post(base)).send({
      documentType: 'invoice',
      name: 'Invoice',
      layout: 'standard',
    })
    expect(response.status).toBe(201)
    expect(response.body.data.object).toBe('document-template')
  })

  it('retrieves a tenant template', async () => {
    const response = await tenantCall(
      request(createApp()).get(`${base}/dtpl_1`)
    )
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: template, error: null })
  })

  it('serializes a missing template as a client-safe 404 envelope', async () => {
    mocks.retrieve.mockRejectedValueOnce(
      appError('billing/document-template-not-found')
    )

    const response = await tenantCall(
      request(createApp()).get(`${base}/dtpl_missing`)
    )

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'billing/document-template-not-found',
        message: 'Document template not found.',
      },
    })
    expect(JSON.stringify(response.body)).not.toContain('httpStatus')
  })

  it('updates a tenant template', async () => {
    const response = await tenantCall(
      request(createApp()).patch(`${base}/dtpl_1`)
    ).send({ name: 'Updated' })
    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith(
      'ten_1',
      'dtpl_1',
      { name: 'Updated' },
      'user_1'
    )
  })

  it('sets the tenant default', async () => {
    const response = await tenantCall(
      request(createApp()).post(`${base}/dtpl_1/set-default`)
    ).send({})
    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('document-template')
  })

  it('deletes a tenant template without exposing httpStatus', async () => {
    const response = await tenantCall(
      request(createApp()).delete(`${base}/dtpl_1`)
    )
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { object: 'document-template', id: 'dtpl_1', deleted: true },
      error: null,
    })
    expect(JSON.stringify(response.body)).not.toContain('httpStatus')
  })

  it('resolves the render-ready tenant template', async () => {
    const response = await tenantCall(
      request(createApp()).get(`${base}/resolved?documentType=invoice`)
    )
    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('resolved-document-template')
  })

  it('retrieves default branding for a tenant', async () => {
    const response = await tenantCall(
      request(createApp()).get('/api/v1/branding')
    )
    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('branding')
  })

  it('requires the integration read scope for organization lists', async () => {
    mocks.activeConnection.mockResolvedValue({ scopes: new Set() })
    const response = await integrationCall(
      request(createApp()).get(integrationBase)
    )
    expect(response.status).toBe(403)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('serves the integration list through the invoices read scope', async () => {
    const response = await integrationCall(
      request(createApp()).get(integrationBase)
    )
    expect(response.status).toBe(200)
    expect(mocks.list).toHaveBeenCalledWith('ten_1', undefined)
  })

  it('requires the integration write scope for mutations', async () => {
    mocks.activeConnection.mockResolvedValue({
      scopes: new Set(['billing.invoices.read']),
    })
    const response = await integrationCall(
      request(createApp()).post(integrationBase)
    ).send({ documentType: 'invoice', name: 'Invoice', layout: 'standard' })
    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('updates organization branding through the invoices write scope', async () => {
    const response = await integrationCall(
      request(createApp()).patch(
        '/api/v1/integrations/organizations/org_1/branding'
      )
    ).send({ appearance: 'dark' })
    expect(response.status).toBe(200)
    expect(mocks.updateBranding).toHaveBeenCalledWith(
      'ten_1',
      { appearance: 'dark' },
      null
    )
  })
})
