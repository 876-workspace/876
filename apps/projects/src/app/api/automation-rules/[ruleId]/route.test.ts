import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  retrieve: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: {
    automationRules: {
      retrieve: mocks.retrieve,
      update: mocks.update,
      remove: mocks.remove,
    },
  },
}))

const { GET, PATCH, DELETE } = await import('./route')

const context = { params: Promise.resolve({ ruleId: 'arl_1' }) }

function request(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/automation-rules/arl_1', {
    method,
    headers:
      body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const rule = {
  object: 'projects.automation-rule',
  id: 'arl_1',
  name: 'Notify on done',
}

const notFound = {
  data: null,
  error: { code: 'projects/automation-rule-not-found', message: 'Missing.' },
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'user_1',
  })
  mocks.retrieve.mockResolvedValue({ data: rule, error: null })
  mocks.update.mockResolvedValue({ data: rule, error: null })
  mocks.remove.mockResolvedValue({ data: rule, error: null })
})

describe('GET /api/automation-rules/[ruleId]', () => {
  it('requires the projects view permission', async () => {
    await GET(request('GET'), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('returns the rule', async () => {
    const response = await GET(request('GET'), context)

    expect(mocks.retrieve).toHaveBeenCalledWith('org_1', 'arl_1')
    expect(response.status).toBe(200)
  })

  it('returns 404 for an unknown rule', async () => {
    mocks.retrieve.mockResolvedValue(notFound)

    expect((await GET(request('GET'), context)).status).toBe(404)
  })
})

describe('PATCH /api/automation-rules/[ruleId]', () => {
  it('requires the projects edit permission', async () => {
    await PATCH(request('PATCH', { enabled: false }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('updates the rule', async () => {
    const response = await PATCH(
      request('PATCH', { enabled: false }),
      context
    )

    expect(mocks.update).toHaveBeenCalledWith('org_1', 'arl_1', {
      enabled: false,
    })
    expect(response.status).toBe(200)
  })

  it('rejects an empty update with 422', async () => {
    const response = await PATCH(request('PATCH', {}), context)

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown rule', async () => {
    mocks.update.mockResolvedValue(notFound)

    expect(
      (await PATCH(request('PATCH', { enabled: false }), context)).status
    ).toBe(404)
  })
})

describe('DELETE /api/automation-rules/[ruleId]', () => {
  it('requires the projects edit permission', async () => {
    await DELETE(request('DELETE'), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('deletes the rule', async () => {
    const response = await DELETE(request('DELETE'), context)

    expect(mocks.remove).toHaveBeenCalledWith('org_1', 'arl_1')
    expect(response.status).toBe(200)
  })
})
