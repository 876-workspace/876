import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getError } from '@/lib/errors'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  createBillingIntegration: vi.fn(),
  retrieve: vi.fn(),
  update: vi.fn(),
  uploadsCreate: vi.fn(),
  uploadsComplete: vi.fn(),
  linksCreate: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/clients/billing', () => ({
  createBillingIntegration: mocks.createBillingIntegration,
}))
vi.mock('@/lib/clients/storage', () => ({
  storage: {
    uploads: { create: mocks.uploadsCreate, complete: mocks.uploadsComplete },
    resourceLinks: { create: mocks.linksCreate, list: vi.fn() },
  },
}))

import { POST } from './route'

function request(body: unknown) {
  return new Request(
    'http://couriers.test/api/manage/finance/payment-mode-images/uploads',
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

const start = {
  orgSlug: 'acme',
  action: 'start',
  paymentModeId: 'pm_1',
  fileName: 'ncb.png',
  contentType: 'image/png',
  sizeBytes: 2048,
}
const complete = {
  orgSlug: 'acme',
  action: 'complete',
  paymentModeId: 'pm_1',
  sessionId: 'ups_1',
}
const readyFile = {
  id: 'file_1',
  status: 'ready',
  owner_type: 'organization',
  owner_id: 'org_1',
  purpose: 'billing_payment_mode_image',
  url: 'https://assets.876.test/org_1/file_1.png',
}

function expectError(response: Response, body: unknown, code: string) {
  const error = getError(code)
  expect(response.status).toBe(error.httpStatus)
  expect(body).toEqual({
    data: null,
    error: { code: error.code, message: error.message },
  })
}

describe('Couriers payment mode image upload route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(context())
    mocks.createBillingIntegration.mockReturnValue({
      paymentModes: { retrieve: mocks.retrieve, update: mocks.update },
    })
    mocks.retrieve.mockResolvedValue({ data: { id: 'pm_1' }, error: null })
    mocks.update.mockResolvedValue({ data: { id: 'pm_1' }, error: null })
    mocks.uploadsCreate.mockResolvedValue({
      data: { object: 'upload_session', id: 'ups_1' },
      error: null,
    })
    mocks.uploadsComplete.mockResolvedValue({ data: readyFile, error: null })
    mocks.linksCreate.mockResolvedValue({ data: { id: 'lnk_1' }, error: null })
  })

  it('rejects a staff member before touching Billing or Storage', async () => {
    mocks.getManageContext.mockResolvedValue(context('staff'))

    const response = await POST(request(start))

    expectError(response, await response.json(), 'finance/forbidden')
    expect(mocks.retrieve).not.toHaveBeenCalled()
    expect(mocks.uploadsCreate).not.toHaveBeenCalled()
  })

  it('rejects an SVG upload without opening a Storage session', async () => {
    const response = await POST(
      request({ ...start, fileName: 'logo.svg', contentType: 'image/svg+xml' })
    )

    expectError(response, await response.json(), 'finance/invalid-payment-mode')
    expect(mocks.uploadsCreate).not.toHaveBeenCalled()
  })

  it('answers not found for a payment mode outside the organization', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: { code: 'billing/payment-mode-not-found', message: 'Not found.' },
    })

    const response = await POST(request(start))

    expectError(
      response,
      await response.json(),
      'finance/payment-mode-not-found'
    )
    expect(mocks.retrieve).toHaveBeenCalledWith('org_1', 'pm_1')
    expect(mocks.uploadsCreate).not.toHaveBeenCalled()
  })

  it('opens an organization-owned upload session on the named route', async () => {
    const response = await POST(request(start))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      data: { object: 'upload_session', id: 'ups_1' },
      error: null,
    })
    expect(mocks.uploadsCreate).toHaveBeenCalledTimes(1)
    expect(mocks.uploadsCreate).toHaveBeenCalledWith({
      route_key: 'billing.paymentModeImage',
      owner_type: 'organization',
      owner_id: 'org_1',
      actor_user_id: 'usr_1',
      source_app_id: '876-couriers',
      file_name: 'ncb.png',
      content_type: 'image/png',
      size_bytes: 2048,
    })
  })

  it('links and attaches a verified file on completion', async () => {
    const response = await POST(request(complete))

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'pm_1', {
      imageFileId: 'file_1',
      imageUrl: 'https://assets.876.test/org_1/file_1.png',
    })
  })

  it('refuses a completed file owned by another organization', async () => {
    mocks.uploadsComplete.mockResolvedValue({
      data: { ...readyFile, owner_id: 'org_other' },
      error: null,
    })

    const response = await POST(request(complete))

    expectError(
      response,
      await response.json(),
      'finance/payment-mode-image-mismatch'
    )
    expect(mocks.linksCreate).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('reports a registered error when the verified file cannot be attached', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: { code: 'billing/unavailable', message: 'Unavailable.' },
    })

    const response = await POST(request(complete))

    expectError(
      response,
      await response.json(),
      'finance/payment-mode-image-attach-failed'
    )
  })
})
