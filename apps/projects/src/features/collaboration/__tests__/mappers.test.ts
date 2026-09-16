import { describe, expect, it } from 'vitest'

import {
  mapActivityItem,
  mapClientGrant,
  mapDiscussion,
  mapDiscussionPost,
  mapWikiPage,
  mapWikiRevision,
} from '../mappers'

describe('mapActivityItem', () => {
  const base = {
    object: 'projects.activity-item' as const,
    id: 'act_1',
    kind: 'issue-event',
    subjectType: 'work-item',
    subjectId: 'iss_1',
    actorUserId: 'usr_1',
    type: 'state-changed',
    fromValue: 'todo',
    toValue: 'doing',
    createdAt: 1788400000,
  }

  it('maps the subject and resolves the actor label', () => {
    const item = mapActivityItem(base, { usr_1: 'Ada' })

    expect(item).toMatchObject({
      object: 'projects.activity',
      id: 'act_1',
      subjectType: 'work-item',
      subjectId: 'iss_1',
      actorLabel: 'Ada',
    })
  })

  it('summarizes a transition with both values', () => {
    const item = mapActivityItem(base, {})

    expect(item.summary).toBe('State Changed: todo → doing')
    expect(item.actorLabel).toBe('usr_1')
  })

  it('summarizes a single-value change', () => {
    const item = mapActivityItem(
      { ...base, fromValue: null, toValue: 'doing' },
      {}
    )

    expect(item.summary).toBe('State Changed: doing')
  })

  it('keeps system activity actorless', () => {
    const item = mapActivityItem({ ...base, actorUserId: null }, {})

    expect(item.actorLabel).toBeNull()
  })

  it('falls back to project for unknown subject types', () => {
    const item = mapActivityItem({ ...base, subjectType: 'starship' }, {})

    expect(item.subjectType).toBe('project')
  })
})

describe('mapDiscussion', () => {
  it('carries pin, lock, and visibility flags', () => {
    const discussion = mapDiscussion({
      object: 'projects.discussion',
      id: 'dsc_1',
      tenantId: 'tnt_1',
      projectId: 'prj_1',
      title: 'Kickoff',
      body: 'Hello',
      pinned: true,
      locked: false,
      clientVisible: true,
      authorUserId: 'usr_1',
      postCount: 3,
      createdAt: 10,
      updatedAt: 12,
    })

    expect(discussion).toMatchObject({
      object: 'projects.discussion',
      pinned: true,
      locked: false,
      clientVisible: true,
      postCount: 3,
    })
  })
})

describe('mapDiscussionPost', () => {
  const post = {
    object: 'projects.discussion-post' as const,
    id: 'post_1',
    tenantId: 'tnt_1',
    discussionId: 'dsc_1',
    authorUserId: 'usr_1',
    body: 'Hello **world**',
    editCount: 0,
    createdAt: 10,
    updatedAt: 10,
  }

  it('resolves the author label and keeps the markdown body', () => {
    const mapped = mapDiscussionPost(post, { usr_1: 'Ada' })

    expect(mapped).toMatchObject({
      authorLabel: 'Ada',
      bodyMarkdown: 'Hello **world**',
      editedAt: null,
    })
  })

  it('marks edited posts from the edit count', () => {
    const mapped = mapDiscussionPost(
      { ...post, editCount: 2, updatedAt: 20 },
      {}
    )

    expect(mapped.editedAt).toBe(20)
  })

  it('falls back to the user id for unknown authors', () => {
    const mapped = mapDiscussionPost(post, {})

    expect(mapped.authorLabel).toBe('usr_1')
  })
})

describe('mapWikiPage', () => {
  it('maps the tree position and revision count', () => {
    const page = mapWikiPage({
      object: 'projects.wiki-page',
      id: 'wiki_1',
      tenantId: 'tnt_1',
      projectId: 'prj_1',
      slug: 'kickoff',
      title: 'Kickoff',
      body: 'Body',
      parentPageId: null,
      revisionCount: 4,
      createdAt: 1,
      updatedAt: 2,
    })

    expect(page).toMatchObject({
      parentId: null,
      currentRevision: 4,
      slug: 'kickoff',
    })
  })
})

describe('mapWikiRevision', () => {
  const revision = {
    object: 'projects.wiki-revision' as const,
    id: 'rev_1',
    pageId: 'wiki_1',
    title: 'Kickoff',
    body: 'Body',
    authorUserId: 'usr_1',
    createdAt: 5,
  }

  it('numbers newest-first revisions from the total', () => {
    const mapped = mapWikiRevision(revision, { index: 0, total: 4 }, {})

    expect(mapped.revision).toBe(4)
  })

  it('numbers the oldest revision as 1', () => {
    const mapped = mapWikiRevision(revision, { index: 3, total: 4 }, {})

    expect(mapped.revision).toBe(1)
  })

  it('resolves the author label', () => {
    const mapped = mapWikiRevision(
      revision,
      { index: 0, total: 1 },
      { usr_1: 'Ada' }
    )

    expect(mapped.authorLabel).toBe('Ada')
    expect(mapped.bodyMarkdown).toBe('Body')
  })
})

describe('mapClientGrant', () => {
  it('maps the invitee label and revocation state', () => {
    const grant = mapClientGrant(
      {
        object: 'projects.client-grant',
        id: 'grant_1',
        tenantId: 'tnt_1',
        projectId: 'prj_1',
        userId: 'usr_client',
        allowComments: true,
        allowDiscussions: true,
        allowFiles: true,
        allowTime: true,
        allowInvoices: true,
        allowWiki: true,
        invitedBy: 'usr_1',
        revokedAt: null,
        createdAt: 100,
        updatedAt: 100,
      },
      { usr_client: 'Client Co' }
    )

    expect(grant).toMatchObject({
      userLabel: 'Client Co',
      invitedAt: 100,
      revokedAt: null,
    })
  })

  it('keeps revoked grants visible with their timestamp', () => {
    const grant = mapClientGrant(
      {
        object: 'projects.client-grant',
        id: 'grant_1',
        tenantId: 'tnt_1',
        projectId: 'prj_1',
        userId: 'usr_client',
        allowComments: true,
        allowDiscussions: true,
        allowFiles: true,
        allowTime: true,
        allowInvoices: true,
        allowWiki: true,
        invitedBy: null,
        revokedAt: 200,
        createdAt: 100,
        updatedAt: 200,
      },
      {}
    )

    expect(grant.revokedAt).toBe(200)
    expect(grant.userLabel).toBe('usr_client')
  })
})
