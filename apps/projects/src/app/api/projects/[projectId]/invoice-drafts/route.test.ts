import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { projectBilling: { createInvoiceDraft: mocks.create } },
}))

const { POST } = await import('./route')

const context = { params: Promise.resolve({ projectId: 'prj_1' }) }

function post(body: unknown) {
  return new Request('http://localhost/api/projects/prj_1/invoice-drafts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.create.mockResolvedValue({
    data: { object: 'projects.invoice-draft', invoiceId: 'inv_1' },
    error: null,
  })
})

describe('POST /api/projects/[projectId]/invoice-drafts', () => {
  it('requires the projects edit permission', async () => {
    await POST(post({ from: 1, to: 2 }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('hands the approved period to Billing with one client call', async () => {
    const response = await POST(
      post({ from: 1704067200, to: 1706745600 }),
      context
    )

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith('org_1', 'prj_1', {
      from: 1704067200,
      to: 1706745600,
    })
  })

  it('returns the invoice draft in the data envelope', async () => {
    const response = await POST(post({ from: 1, to: 2 }), context)

    expect(await response.json()).toEqual({
      data: { object: 'projects.invoice-draft', invoiceId: 'inv_1' },
      error: null,
    })
  })

  it('rejects an inverted period without calling Billing', async () => {
    const response = await POST(post({ from: 9, to: 9 }), context)

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects an unknown field', async () => {
    const response = await POST(
      post({ from: 1, to: 2, billedEntryIds: ['te_1'] }),
      context
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
