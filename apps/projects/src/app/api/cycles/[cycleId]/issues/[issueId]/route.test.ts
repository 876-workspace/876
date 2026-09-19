import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  unassign: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { cycles: { unassignIssue: mocks.unassign } },
}))

const { DELETE } = await import('./route')

function context() {
  return { params: Promise.resolve({ cycleId: 'cyc_1', issueId: 'iss_1' }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.unassign.mockResolvedValue({
    data: { object: 'cycle', id: 'cyc_1' },
    error: null,
  })
})

describe('DELETE /api/cycles/[cycleId]/issues/[issueId]', () => {
  it('requires the projects edit permission', async () => {
    await DELETE(
      new Request('http://localhost/api/cycles/cyc_1/issues/iss_1'),
      context(),
    )

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('unassigns the issue', async () => {
    const response = await DELETE(
      new Request('http://localhost/api/cycles/cyc_1/issues/iss_1'),
      context(),
    )

    expect(response.status).toBe(200)
    expect(mocks.unassign).toHaveBeenCalledWith('org_1', 'cyc_1', 'iss_1')
  })
})
