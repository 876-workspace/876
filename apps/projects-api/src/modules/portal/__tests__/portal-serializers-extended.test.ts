import { describe, expect, it } from 'vitest'

import {
  serializePortalAttachment,
  serializePortalComment,
  serializePortalDiscussion,
  serializePortalDiscussionPost,
  serializePortalIssue,
  serializePortalMilestone,
  serializePortalMilestoneComment,
  serializePortalWikiPage,
} from '../portal.serializers.js'

describe('portal issue serializer hardening', () => {
  it('drops every internal issue field while mapping values exactly', () => {
    const serialized = serializePortalIssue({
      id: 'iss_1',
      tenantId: 'ten_alpha',
      projectId: 'prj_alpha',
      number: 42,
      identifier: 'ALPHA-42',
      title: 'Client request',
      description: 'Details',
      status: 'doing',
      workflowStateId: 'wfs_doing',
      typeKey: 'task',
      workItemTypeId: 'wit_task',
      milestoneId: 'mls_1',
      taskListId: 'tl_1',
      cycleId: 'cyc_1',
      priority: 'urgent',
      assigneeUserId: 'usr_internal',
      creatorUserId: 'usr_owner',
      parentIssueId: 'iss_parent',
      estimate: 480,
      dueDate: 1787853600n,
      position: 3,
      clientVisible: true,
      startedAt: 1787767200n,
      completedAt: null,
      canceledAt: null,
      deletedAt: null,
      createdAt: 1787767200n,
      updatedAt: 1787767300n,
      project: { key: 'ALPHA' },
      labels: [],
    })

    expect(serialized).toEqual({
      object: 'portal.issue',
      id: 'iss_1',
      projectId: 'prj_alpha',
      identifier: 'ALPHA-42',
      title: 'Client request',
      description: 'Details',
      status: 'doing',
      priority: 'urgent',
      milestoneId: 'mls_1',
      createdAt: 1787767200,
      updatedAt: 1787767300,
    })
  })

  it('maps null descriptions and milestones without leaking internals', () => {
    const serialized = serializePortalIssue({
      id: 'iss_2',
      tenantId: 'ten_alpha',
      projectId: 'prj_alpha',
      number: 43,
      identifier: 'ALPHA-43',
      title: 'Bare issue',
      description: null,
      status: 'todo',
      workflowStateId: null,
      typeKey: 'task',
      workItemTypeId: null,
      milestoneId: null,
      priority: 'none',
      assigneeUserId: null,
      creatorUserId: null,
      parentIssueId: null,
      estimate: null,
      dueDate: null,
      position: 0,
      clientVisible: true,
      startedAt: null,
      completedAt: null,
      canceledAt: null,
      deletedAt: null,
      createdAt: 1787767200n,
      updatedAt: 1787767200n,
    })

    expect(serialized.description).toBeNull()
    expect(serialized.milestoneId).toBeNull()
    expect(serialized).not.toHaveProperty('estimate')
    expect(serialized).not.toHaveProperty('number')
  })
})

describe('portal milestone serializer hardening', () => {
  it('drops every internal milestone field while mapping dates exactly', () => {
    const serialized = serializePortalMilestone({
      id: 'mls_1',
      tenantId: 'ten_alpha',
      projectId: 'prj_alpha',
      key: 'phase-1',
      name: 'Phase 1',
      description: 'First phase',
      status: 'active',
      ownerUserId: 'usr_owner',
      startDate: 1787767200n,
      targetDate: 1787853600n,
      completedAt: null,
      position: 2,
      clientVisible: true,
      deletedAt: null,
      createdAt: 1787767200n,
      updatedAt: 1787767300n,
    })

    expect(serialized).toEqual({
      object: 'portal.milestone',
      id: 'mls_1',
      projectId: 'prj_alpha',
      key: 'phase-1',
      name: 'Phase 1',
      description: 'First phase',
      status: 'active',
      startDate: 1787767200,
      targetDate: 1787853600,
      completedAt: null,
      createdAt: 1787767200,
      updatedAt: 1787767300,
    })
  })
})

describe('portal comment serializer hardening', () => {
  it('keeps the author id but drops tenant and visibility metadata', () => {
    const source = {
      object: 'projects.comment',
      id: 'cmt_1',
      tenantId: 'ten_alpha',
      issueId: 'iss_1',
      authorUserId: 'usr_client',
      body: 'Looks good',
      clientVisible: true,
      createdAt: 1787767200n,
      updatedAt: 1787767300n,
    }
    const serialized = serializePortalComment(source)

    expect(serialized).toEqual({
      object: 'portal.comment',
      id: 'cmt_1',
      issueId: 'iss_1',
      authorUserId: 'usr_client',
      body: 'Looks good',
      createdAt: 1787767200,
      updatedAt: 1787767300,
    })
  })

  it('maps milestone comments with null authors exactly', () => {
    const source = {
      id: 'mcm_1',
      tenantId: 'ten_alpha',
      milestoneId: 'mls_1',
      authorUserId: null,
      body: 'Phase update',
      clientVisible: true,
      createdAt: 1787767200n,
      updatedAt: 1787767200n,
    }
    const serialized = serializePortalMilestoneComment(source)

    expect(serialized).toEqual({
      object: 'portal.milestone-comment',
      id: 'mcm_1',
      milestoneId: 'mls_1',
      authorUserId: null,
      body: 'Phase update',
      createdAt: 1787767200,
      updatedAt: 1787767200,
    })
  })
})

describe('portal discussion serializer hardening', () => {
  it('drops lock state, author, tenant, and counts from discussions', () => {
    const serialized = serializePortalDiscussion({
      object: 'projects.discussion',
      id: 'dsc_1',
      tenantId: 'ten_alpha',
      projectId: 'prj_alpha',
      title: 'Kickoff <script>alert(1)</script>',
      body: 'Welcome',
      pinned: true,
      locked: true,
      clientVisible: true,
      authorUserId: 'usr_owner',
      postCount: 9,
      createdAt: 1787767200,
      updatedAt: 1787767300,
    })

    expect(serialized).toEqual({
      object: 'portal.discussion',
      id: 'dsc_1',
      projectId: 'prj_alpha',
      title: 'Kickoff <script>alert(1)</script>',
      body: 'Welcome',
      pinned: true,
      createdAt: 1787767200,
      updatedAt: 1787767300,
    })
  })

  it('drops tenant and edit counts from discussion posts', () => {
    const serialized = serializePortalDiscussionPost({
      object: 'projects.discussion-post',
      id: 'dpt_1',
      tenantId: 'ten_alpha',
      discussionId: 'dsc_1',
      authorUserId: 'usr_client',
      body: 'Reply',
      editCount: 4,
      createdAt: 1787767200,
      updatedAt: 1787767300,
    })

    expect(serialized).toEqual({
      object: 'portal.discussion-post',
      id: 'dpt_1',
      discussionId: 'dsc_1',
      authorUserId: 'usr_client',
      body: 'Reply',
      createdAt: 1787767200,
      updatedAt: 1787767300,
    })
    expect(serialized).not.toHaveProperty('tenantId')
    expect(serialized).not.toHaveProperty('editCount')
  })
})

describe('portal wiki serializer hardening', () => {
  it('drops tenant, revision counts, and creation timestamps', () => {
    const serialized = serializePortalWikiPage({
      object: 'projects.wiki-page',
      id: 'wpg_1',
      tenantId: 'ten_alpha',
      projectId: 'prj_alpha',
      slug: 'kickoff',
      title: 'Kickoff',
      body: 'Notes',
      parentPageId: 'wpg_parent',
      revisionCount: 12,
      createdAt: 1787767200,
      updatedAt: 1787767300,
    })

    expect(serialized).toEqual({
      object: 'portal.wiki-page',
      id: 'wpg_1',
      projectId: 'prj_alpha',
      slug: 'kickoff',
      title: 'Kickoff',
      body: 'Notes',
      parentPageId: 'wpg_parent',
      updatedAt: 1787767300,
    })
  })
})

describe('portal attachment serializer hardening', () => {
  it('drops tenant, visibility, creator, and update timestamps', () => {
    const serialized = serializePortalAttachment({
      id: 'att_1',
      tenantId: 'ten_alpha',
      projectId: 'prj_alpha',
      issueId: 'iss_1',
      milestoneId: 'mls_1',
      url: 'https://files.example/spec.pdf',
      name: null,
      clientVisible: true,
      createdBy: 'usr_owner',
      createdAt: 1787767200n,
      updatedAt: 1787767400n,
    })

    expect(serialized).toEqual({
      object: 'portal.attachment',
      id: 'att_1',
      issueId: 'iss_1',
      milestoneId: 'mls_1',
      url: 'https://files.example/spec.pdf',
      name: null,
      createdAt: 1787767200,
    })
  })
})
