import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenantsMod, projectsMod, repository } = vi.hoisted(() => ({
  tenantsMod: { resolveTenant: vi.fn() },
  projectsMod: { resolveProject: vi.fn() },
  repository: { listActivity: vi.fn() },
}))

vi.mock('../../tenants/index.js', () => tenantsMod)
vi.mock('../../projects/index.js', () => projectsMod)
vi.mock('../activity.repository.js', () => repository)

const service = await import('../activity.service.js')
const serializers = await import('../activity.serializers.js')

const tenant = { id: 'ten_alpha' }
const project = { id: 'prj_alpha' }

function row(id: string, createdAt: bigint) {
  return {
    id,
    kind: 'issue-event',
    subjectType: 'work-item',
    subjectId: 'iss_1',
    actorUserId: 'usr_ada',
    type: 'status-changed',
    fromValue: 'todo',
    toValue: 'doing',
    createdAt,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  tenantsMod.resolveTenant.mockResolvedValue(tenant)
  projectsMod.resolveProject.mockResolvedValue(project)
})

describe('activity cursor across equal timestamps', () => {
  it('keeps repository order for items sharing createdAt', async () => {
    repository.listActivity.mockResolvedValue([
      row('evt_3', 1787767200n),
      row('evt_2', 1787767200n),
      row('evt_1', 1787767200n),
    ])

    const result = await service.listProjectActivity('org_1', project.id, {})

    expect(result.error).toBeNull()
    expect(result.data?.items.map((item) => item.id)).toEqual([
      'evt_3',
      'evt_2',
      'evt_1',
    ])
  })

  it('paginates equal-timestamp pages with a stable cursor', async () => {
    repository.listActivity.mockResolvedValue([
      row('evt_3', 1787767200n),
      row('evt_2', 1787767200n),
      row('evt_1', 1787767200n),
    ])

    const result = await service.listProjectActivity('org_1', project.id, {
      limit: 2,
    })

    expect(result.data?.items.map((item) => item.id)).toEqual([
      'evt_3',
      'evt_2',
    ])
    expect(result.data?.hasMore).toBe(true)
    expect(result.data?.nextCursor).toBe('1787767200:evt_2')
  })

  it('forwards an opaque cursor to the repository untouched', async () => {
    repository.listActivity.mockResolvedValue([row('evt_1', 1787767200n)])

    const result = await service.listProjectActivity('org_1', project.id, {
      limit: 25,
      cursor: '1787767250:evt_9',
    })

    expect(result.error).toBeNull()
    expect(repository.listActivity).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: tenant.id, projectId: project.id }),
      expect.objectContaining({ limit: 25, cursor: '1787767250:evt_9' })
    )
  })

  it('reports an unknown tenant as 404 without a repository call', async () => {
    tenantsMod.resolveTenant.mockResolvedValue(null)

    const result = await service.listProjectActivity('org_1', project.id, {})

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/tenant-not-found')
    expect(repository.listActivity).not.toHaveBeenCalled()
  })

  it('round-trips cursors whose ids contain separators', () => {
    const encoded = serializers.encodeActivityCursor({
      createdAt: 1787767200,
      id: 'evt:with:colons',
    })
    expect(serializers.decodeActivityCursor(encoded)).toEqual({
      createdAt: 1787767200n,
      id: 'evt:with:colons',
    })
  })

  it('rejects cursors with fractional or negative timestamps', () => {
    expect(serializers.decodeActivityCursor('12.5:evt_1')).toBeNull()
    expect(serializers.decodeActivityCursor('-1:evt_1')).toBeNull()
    expect(serializers.decodeActivityCursor('1787767200:')).toBeNull()
    expect(serializers.decodeActivityCursor(':evt_1')).toBeNull()
  })

  it('encodes the last item of a full page as the next cursor', async () => {
    repository.listActivity.mockResolvedValue([
      row('evt_b', 1787767300n),
      row('evt_a', 1787767200n),
    ])

    const result = await service.listProjectActivity('org_1', project.id, {
      limit: 1,
    })

    expect(result.data?.nextCursor).toBe('1787767300:evt_b')
    expect(serializers.decodeActivityCursor(result.data?.nextCursor ?? '')).toEqual({
      createdAt: 1787767300n,
      id: 'evt_b',
    })
  })
})
