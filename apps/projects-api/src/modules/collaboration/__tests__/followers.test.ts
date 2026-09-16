import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenantsMod, projectsMod, issuesMod, workStructureMod, automationMod, repository } =
  vi.hoisted(() => ({
    tenantsMod: { resolveTenant: vi.fn() },
    projectsMod: { resolveProject: vi.fn() },
    issuesMod: { resolveIssue: vi.fn() },
    workStructureMod: { resolveMilestoneById: vi.fn() },
    automationMod: { createNotificationRecord: vi.fn() },
    repository: {
      upsertFollows: vi.fn(),
      upsertTenantFollows: vi.fn(),
      followOne: vi.fn(),
      removeFollow: vi.fn(),
      listForSubject: vi.fn(),
    },
  }))

vi.mock('../../tenants/index.js', () => tenantsMod)
vi.mock('../../projects/index.js', () => projectsMod)
vi.mock('../../issues/index.js', () => issuesMod)
vi.mock('../../work-structure/index.js', () => workStructureMod)
vi.mock('../../automation/index.js', () => automationMod)
vi.mock('../followers.repository.js', () => repository)

const service = await import('../followers.service.js')

const tenant = { id: 'ten_alpha' }
const project = { id: 'prj_alpha' }

const followerRow = {
  id: 'flw_1',
  tenantId: tenant.id,
  subjectType: 'project',
  subjectId: project.id,
  userId: 'usr_ada',
  createdAt: 1787767200n,
}

beforeEach(() => {
  vi.clearAllMocks()
  tenantsMod.resolveTenant.mockResolvedValue(tenant)
  projectsMod.resolveProject.mockResolvedValue(project)
})

describe('followers service', () => {
  it('follows a project and serializes the follower', async () => {
    repository.followOne.mockResolvedValue(followerRow)

    const result = await service.follow('org_1', {
      subjectType: 'project',
      subjectId: project.id,
      userId: 'usr_ada',
    })

    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({
      object: 'projects.follower',
      userId: 'usr_ada',
      createdAt: 1787767200,
    })
    expect(repository.followOne).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({
        subjectType: 'project',
        subjectId: project.id,
        userId: 'usr_ada',
      })
    )
  })

  it('rejects follows for unknown work items', async () => {
    issuesMod.resolveIssue.mockResolvedValue(null)

    const result = await service.follow('org_1', {
      subjectType: 'work-item',
      subjectId: 'iss_missing',
      userId: 'usr_ada',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/issue-not-found')
  })

  it('unfollows and reports whether a row was removed', async () => {
    repository.removeFollow.mockResolvedValue(true)

    const result = await service.unfollow(
      'org_1',
      'project',
      project.id,
      'usr_ada'
    )

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ unfollowed: true })
    expect(repository.removeFollow).toHaveBeenCalledWith(
      tenant.id,
      'project',
      project.id,
      'usr_ada'
    )
  })

  it('lists followers with limit+1 pagination', async () => {
    const rows = [followerRow, { ...followerRow, id: 'flw_2' }, { ...followerRow, id: 'flw_3' }]
    repository.listForSubject.mockResolvedValue(rows)

    const result = await service.list('org_1', {
      subjectType: 'project',
      subjectId: project.id,
      limit: 2,
    })

    expect(result.error).toBeNull()
    expect(result.data?.items).toHaveLength(2)
    expect(result.data?.hasMore).toBe(true)
  })

  it('notifies mentioned users with mention-kind records', async () => {
    await service.notifyMentionedUsers({
      tenantId: tenant.id,
      userIds: ['usr_ada', 'usr_grace'],
      subjectType: 'discussion',
      subjectId: 'dsc_1',
      title: 'You were mentioned',
    })

    expect(automationMod.createNotificationRecord).toHaveBeenCalledTimes(2)
    expect(automationMod.createNotificationRecord).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ userId: 'usr_ada', kind: 'mention' })
    )
  })

  it('mentionedUserIds excludes the author self mention', () => {
    expect(
      service.mentionedUserIds(
        '@[Me](user:usr_me) plus @[Ada](user:usr_ada)',
        'usr_me'
      )
    ).toEqual(['usr_ada'])
  })
})
