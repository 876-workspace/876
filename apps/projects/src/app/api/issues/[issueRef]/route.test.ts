import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { issues: { update: mocks.update } },
}))

const { PATCH } = await import('./route')

function request(body: unknown) {
  return new NextRequest('http://localhost/api/issues/CONSOLE-12', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const context = { params: Promise.resolve({ issueRef: 'CONSOLE-12' }) }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'user_1',
  })
  mocks.update.mockResolvedValue({
    data: { object: 'projects.issue', id: 'issue_1', identifier: 'CONSOLE-12' },
    error: null,
  })
})

describe('PATCH /api/issues/:issueRef', () => {
  it('requires issue edit access before touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response('{"error":"Forbidden."}', { status: 403 }),
    })

    const response = await PATCH(request({ title: 'Updated' }), context)

    expect(response.status).toBe(403)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects empty and unknown-field updates', async () => {
    const emptyResponse = await PATCH(request({}), context)
    const unknownResponse = await PATCH(
      request({ title: 'Updated', nope: true }),
      context
    )

    expect(emptyResponse.status).toBe(422)
    expect(unknownResponse.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects a caller-supplied creator identity', async () => {
    const response = await PATCH(
      request({ title: 'Updated', creatorUserId: 'user_other' }),
      context
    )

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('updates through the owning client and injects the acting user', async () => {
    const response = await PATCH(
      request({
        title: 'Updated issue',
        status: 'ready-for-qa',
        milestoneId: null,
        assigneeUserId: 'user_2',
        estimate: 5,
        labelIds: ['label_1'],
        customFields: [{ fieldId: 'field_1', value: 'production' }],
      }),
      context
    )

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'issues',
      permission: 'issues.edit',
    })
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'CONSOLE-12', {
      title: 'Updated issue',
      status: 'ready-for-qa',
      milestoneId: null,
      assigneeUserId: 'user_2',
      estimate: 5,
      labelIds: ['label_1'],
      customFields: [{ fieldId: 'field_1', value: 'production' }],
      actorUserId: 'user_1',
    })
    expect(response.status).toBe(200)
  })

  it('returns issue-not-found as 404', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/issue-not-found',
        message: 'The issue could not be found.',
      },
    })

    const response = await PATCH(request({ title: 'Updated issue' }), context)

    expect(response.status).toBe(404)
  })
})
