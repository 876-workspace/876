import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  collaborationMod,
  commentsMod,
  discussionsMod,
  financeMod,
  issuesMod,
  timeMod,
  wikiMod,
  workStructureMod,
  attachmentsMod,
} = vi.hoisted(() => ({
  collaborationMod: { listActivityForScope: vi.fn() },
  commentsMod: {},
  discussionsMod: {
    listDiscussions: vi.fn(),
    retrieveDiscussion: vi.fn(),
    listPosts: vi.fn(),
  },
  financeMod: { listBilledInvoices: vi.fn() },
  issuesMod: {},
  timeMod: { listTimeEntries: vi.fn() },
  wikiMod: {},
  workStructureMod: { listVisibleMilestones: vi.fn() },
  attachmentsMod: {},
}))

vi.mock('../../collaboration/index.js', () => collaborationMod)
vi.mock('../../comments/index.js', () => commentsMod)
vi.mock('../../discussions/index.js', () => discussionsMod)
vi.mock('../../finance/index.js', () => financeMod)
vi.mock('../../issues/index.js', () => issuesMod)
vi.mock('../../time/index.js', () => timeMod)
vi.mock('../../wiki/index.js', () => wikiMod)
vi.mock('../../work-structure/index.js', () => workStructureMod)
vi.mock('../attachment-links.service.js', () => attachmentsMod)

const service = await import('../portal.service.js')

function grant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cgt_1',
    tenantId: 'ten_alpha',
    projectId: 'prj_alpha',
    userId: 'usr_client',
    allowComments: true,
    allowDiscussions: true,
    allowFiles: true,
    allowTime: true,
    allowInvoices: true,
    allowWiki: true,
    invitedBy: 'usr_owner',
    revokedAt: null,
    createdAt: 1787767200n,
    updatedAt: 1787767200n,
    ...overrides,
  }
}

const scope = {
  organizationId: 'org_alpha',
  tenantId: 'ten_alpha',
  projectId: 'prj_alpha',
  grant: grant(),
  portalUserId: 'usr_client',
}

function discussion(id: string, clientVisible: boolean) {
  return {
    object: 'projects.discussion',
    id,
    tenantId: 'ten_alpha',
    projectId: 'prj_alpha',
    title: `Thread ${id}`,
    body: 'Body',
    pinned: false,
    locked: false,
    clientVisible,
    authorUserId: 'usr_owner',
    postCount: 0,
    createdAt: 1787767200,
    updatedAt: 1787767200,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('portal service visibility', () => {
  it('excludes non-visible discussions from the portal list', async () => {
    discussionsMod.listDiscussions.mockResolvedValue({
      data: {
        items: [discussion('dsc_vis', true), discussion('dsc_hidden', false)],
        hasMore: false,
      },
      error: null,
    })

    const result = await service.listDiscussions(scope, {})

    expect(result.error).toBeNull()
    expect(result.data?.items.map((item) => item.id)).toEqual(['dsc_vis'])
  })

  it('reads a non-visible discussion as not-found', async () => {
    discussionsMod.retrieveDiscussion.mockResolvedValue({
      data: discussion('dsc_hidden', false),
      error: null,
    })

    const result = await service.retrieveDiscussion(scope, 'dsc_hidden')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/discussion-not-found')
  })

  it('denies discussion access when the grant flag is off', async () => {
    const denied = { ...scope, grant: grant({ allowDiscussions: false }) }

    const result = await service.listDiscussions(denied, {})

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/portal-forbidden')
    expect(discussionsMod.listDiscussions).not.toHaveBeenCalled()
  })

  it('exposes invoices as Billing ids plus status with no cost fields', async () => {
    financeMod.listBilledInvoices.mockResolvedValue({
      data: [
        {
          invoiceId: 'inv_1',
          status: 'paid',
          billedMinutes: 600,
          entryCount: 4,
        },
      ],
      error: null,
    })

    const result = await service.listInvoices(scope)

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0]).toEqual({
      object: 'portal.invoice',
      invoiceId: 'inv_1',
      status: 'paid',
      billedHours: 10,
      entryCount: 4,
    })
    for (const forbidden of ['amount', 'cost', 'rate', 'currency', 'total'])
      expect(result.data?.[0]).not.toHaveProperty(forbidden)
  })

  it('exposes time only as hours grouped by phase', async () => {
    timeMod.listTimeEntries.mockResolvedValue({
      data: [
        { milestoneId: 'mls_1', durationMinutes: 90 },
        { milestoneId: 'mls_1', durationMinutes: 30 },
        { milestoneId: null, durationMinutes: 60 },
      ],
      error: null,
    })
    workStructureMod.listVisibleMilestones.mockResolvedValue({
      data: [{ id: 'mls_1', name: 'Phase 1' }],
      error: null,
    })

    const result = await service.getTimeByPhase(scope)

    expect(result.error).toBeNull()
    expect(result.data).toEqual([
      {
        object: 'portal.phase-hours',
        milestoneId: 'mls_1',
        milestoneName: 'Phase 1',
        hours: 2,
      },
      {
        object: 'portal.phase-hours',
        milestoneId: null,
        milestoneName: null,
        hours: 1,
      },
    ])
    for (const row of result.data ?? []) {
      expect(row).not.toHaveProperty('minutes')
      expect(row).not.toHaveProperty('cost')
    }
  })

  it('denies time aggregates when the grant flag is off', async () => {
    const denied = { ...scope, grant: grant({ allowTime: false }) }

    const result = await service.getTimeByPhase(denied)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/portal-forbidden')
    expect(timeMod.listTimeEntries).not.toHaveBeenCalled()
  })
})
