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

function row(id: string, createdAt: bigint, kind: 'issue-event' | 'milestone-event' = 'issue-event') {
  return {
    id,
    kind,
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

describe('activity feed', () => {
  it('unions source tables preserving newest-first order', async () => {
    repository.listActivity.mockResolvedValue([
      row('evt_3', 1787767300n, 'milestone-event'),
      row('evt_2', 1787767250n),
      row('evt_1', 1787767200n),
    ])

    const result = await service.listProjectActivity('org_1', project.id, {})

    expect(result.error).toBeNull()
    expect(result.data?.items.map((item) => item.id)).toEqual([
      'evt_3',
      'evt_2',
      'evt_1',
    ])
    expect(result.data?.items[0]).toMatchObject({
      object: 'projects.activity-item',
      kind: 'milestone-event',
    })
  })

  it('paginates with limit+1 and returns a stable (createdAt,id) cursor', async () => {
    repository.listActivity.mockResolvedValue([
      row('evt_2', 1787767250n),
      row('evt_1', 1787767200n),
    ])

    const result = await service.listProjectActivity('org_1', project.id, {
      limit: 1,
    })

    expect(result.data?.items).toHaveLength(1)
    expect(result.data?.hasMore).toBe(true)
    const cursor = result.data?.nextCursor
    expect(cursor).toBe('1787767250:evt_2')
    expect(serializers.decodeActivityCursor(cursor ?? '')).toEqual({
      createdAt: 1787767250n,
      id: 'evt_2',
    })
  })

  it('omits the cursor on the final page', async () => {
    repository.listActivity.mockResolvedValue([row('evt_1', 1787767200n)])

    const result = await service.listProjectActivity('org_1', project.id, {
      limit: 25,
    })

    expect(result.data?.hasMore).toBe(false)
    expect(result.data?.nextCursor).toBeNull()
  })

  it('rejects malformed cursors', () => {
    expect(serializers.decodeActivityCursor('not-a-cursor')).toBeNull()
    expect(serializers.decodeActivityCursor('')).toBeNull()
    expect(serializers.decodeActivityCursor('-5:evt_1')).toBeNull()
  })

  it('returns 404 for unknown projects without touching the repository', async () => {
    projectsMod.resolveProject.mockResolvedValue(null)

    const result = await service.listProjectActivity('org_1', 'prj_missing', {})

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/project-not-found')
    expect(repository.listActivity).not.toHaveBeenCalled()
  })
})
