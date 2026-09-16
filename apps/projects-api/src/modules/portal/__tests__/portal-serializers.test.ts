import { describe, expect, it } from 'vitest'

import {
  serializePortalAttachment,
  serializePortalComment,
  serializePortalDiscussion,
  serializePortalIssue,
  serializePortalMilestone,
  serializePortalMilestoneComment,
  serializePortalWikiPage,
} from '../portal.serializers.js'

const issueRow = {
  id: 'iss_1',
  tenantId: 'ten_alpha',
  projectId: 'prj_alpha',
  number: 7,
  identifier: 'ALPHA-7',
  title: 'Client visible issue',
  description: 'Details',
  status: 'doing',
  workflowStateId: null,
  typeKey: 'task',
  workItemTypeId: null,
  milestoneId: 'mls_1',
  priority: 'high',
  assigneeUserId: 'usr_internal',
  creatorUserId: 'usr_owner',
  parentIssueId: null,
  estimate: 120,
  dueDate: null,
  position: 0,
  clientVisible: true,
  startedAt: null,
  completedAt: null,
  canceledAt: null,
  deletedAt: null,
  createdAt: 1787767200n,
  updatedAt: 1787767300n,
}

const milestoneRow = {
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
  position: 0,
  clientVisible: true,
  deletedAt: null,
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

describe('portal serializers', () => {
  it('exposes exactly the client-safe issue keys', () => {
    const serialized = serializePortalIssue(issueRow)

    expect(Object.keys(serialized).sort()).toEqual(
      [
        'createdAt',
        'description',
        'id',
        'identifier',
        'milestoneId',
        'object',
        'priority',
        'projectId',
        'status',
        'title',
        'updatedAt',
      ].sort()
    )
    expect(serialized.object).toBe('portal.issue')
    for (const internal of [
      'assigneeUserId',
      'creatorUserId',
      'estimate',
      'tenantId',
      'workflowStateId',
      'clientVisible',
    ])
      expect(serialized).not.toHaveProperty(internal)
  })

  it('exposes exactly the client-safe milestone keys', () => {
    const serialized = serializePortalMilestone(milestoneRow)

    expect(Object.keys(serialized).sort()).toEqual(
      [
        'completedAt',
        'createdAt',
        'description',
        'id',
        'key',
        'name',
        'object',
        'projectId',
        'startDate',
        'status',
        'targetDate',
        'updatedAt',
      ].sort()
    )
    for (const internal of [
      'ownerUserId',
      'position',
      'tenantId',
      'clientVisible',
    ])
      expect(serialized).not.toHaveProperty(internal)
  })

  it('omits internal comment metadata', () => {
    const serialized = serializePortalComment({
      id: 'cmt_1',
      issueId: 'iss_1',
      authorUserId: 'usr_client',
      body: 'Looks good',
      createdAt: 1787767200n,
      updatedAt: 1787767200n,
    })

    expect(Object.keys(serialized).sort()).toEqual(
      [
        'authorUserId',
        'body',
        'createdAt',
        'id',
        'issueId',
        'object',
        'updatedAt',
      ].sort()
    )
  })

  it('omits internal milestone-comment metadata', () => {
    const serialized = serializePortalMilestoneComment({
      id: 'mcm_1',
      milestoneId: 'mls_1',
      authorUserId: null,
      body: 'Phase update',
      createdAt: 1787767200n,
      updatedAt: 1787767200n,
    })

    expect(serialized.object).toBe('portal.milestone-comment')
    expect(Object.keys(serialized)).not.toContain('tenantId')
  })

  it('strips discussion internals like lock state and author', () => {
    const serialized = serializePortalDiscussion({
      object: 'projects.discussion',
      id: 'dsc_1',
      tenantId: 'ten_alpha',
      projectId: 'prj_alpha',
      title: 'Kickoff',
      body: 'Welcome',
      pinned: true,
      locked: true,
      clientVisible: true,
      authorUserId: 'usr_owner',
      postCount: 3,
      createdAt: 1787767200,
      updatedAt: 1787767200,
    })

    expect(Object.keys(serialized).sort()).toEqual(
      [
        'body',
        'createdAt',
        'id',
        'object',
        'pinned',
        'projectId',
        'title',
        'updatedAt',
      ].sort()
    )
    for (const internal of [
      'locked',
      'authorUserId',
      'tenantId',
      'clientVisible',
      'postCount',
    ])
      expect(serialized).not.toHaveProperty(internal)
  })

  it('strips wiki internals like revision counts', () => {
    const serialized = serializePortalWikiPage({
      object: 'projects.wiki-page',
      id: 'wpg_1',
      tenantId: 'ten_alpha',
      projectId: 'prj_alpha',
      slug: 'kickoff',
      title: 'Kickoff',
      body: 'Notes',
      parentPageId: null,
      revisionCount: 4,
      createdAt: 1787767200,
      updatedAt: 1787767300,
    })

    expect(Object.keys(serialized).sort()).toEqual(
      [
        'body',
        'id',
        'object',
        'parentPageId',
        'projectId',
        'slug',
        'title',
        'updatedAt',
      ].sort()
    )
    expect(serialized).not.toHaveProperty('revisionCount')
    expect(serialized).not.toHaveProperty('tenantId')
  })

  it('strips attachment internals like creator and tenant', () => {
    const serialized = serializePortalAttachment({
      id: 'att_1',
      tenantId: 'ten_alpha',
      projectId: 'prj_alpha',
      issueId: 'iss_1',
      milestoneId: null,
      url: 'https://files.example/spec.pdf',
      name: 'spec.pdf',
      clientVisible: true,
      createdBy: 'usr_owner',
      createdAt: 1787767200n,
      updatedAt: 1787767200n,
    })

    expect(Object.keys(serialized).sort()).toEqual(
      ['createdAt', 'id', 'issueId', 'milestoneId', 'name', 'object', 'url'].sort()
    )
    expect(serialized).not.toHaveProperty('createdBy')
    expect(serialized).not.toHaveProperty('tenantId')
  })
})
