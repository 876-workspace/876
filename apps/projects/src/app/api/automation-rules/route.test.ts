import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  listRules: vi.fn(),
  createRule: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: {
    automationRules: {
      list: mocks.listRules,
      create: mocks.createRule,
    },
  },
}))

const { GET, POST } = await import('./route')

function request(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/automation-rules', {
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

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'user_1',
  })
  mocks.listRules.mockResolvedValue({
    data: { object: 'list', data: [rule] },
    error: null,
  })
  mocks.createRule.mockResolvedValue({ data: rule, error: null })
})

describe('GET /api/automation-rules', () => {
  it('requires the projects view permission', async () => {
    await GET()

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('lists rules for the organization', async () => {
    const response = await GET()

    expect(mocks.listRules).toHaveBeenCalledWith('org_1')
    expect(response.status).toBe(200)
  })

  it('returns 400 when the service fails', async () => {
    mocks.listRules.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Down.' },
    })

    expect((await GET()).status).toBe(400)
  })
})

describe('POST /api/automation-rules', () => {
  const input = {
    name: 'Notify on done',
    trigger: 'work-item.state-changed',
    actions: [{ type: 'notify', userId: 'usr_1', title: 'Done' }],
  }

  it('requires the projects edit permission', async () => {
    await POST(request('POST', input))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('creates the rule and answers 201', async () => {
    const response = await POST(request('POST', input))

    expect(mocks.createRule).toHaveBeenCalledWith('org_1', input)
    expect(response.status).toBe(201)
  })

  it('rejects an unknown trigger with 422', async () => {
    const response = await POST(
      request('POST', { ...input, trigger: 'spaceship.launched' })
    )

    expect(response.status).toBe(422)
    expect(mocks.createRule).not.toHaveBeenCalled()
  })

  it('returns 400 when the service rejects the rule', async () => {
    mocks.createRule.mockResolvedValue({
      data: null,
      error: { code: 'projects/invalid-rule', message: 'Bad.' },
    })

    expect((await POST(request('POST', input))).status).toBe(400)
  })
})
