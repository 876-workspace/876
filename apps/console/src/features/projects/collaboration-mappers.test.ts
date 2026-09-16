import { describe, expect, it } from 'vitest'

import {
  toUiActivityItem,
  toUiClientGrant,
  toUiDiscussion,
  toUiDiscussionPost,
  toUiWikiPage,
  toUiWikiRevision,
} from './collaboration-mappers'
import {
  makeActivityItem,
  makeClientGrant,
  makeDiscussion,
  makeDiscussionPost,
  makeWikiPage,
  makeWikiRevision,
} from './test-fixtures'

describe('toUiActivityItem', () => {
  it('maps known subject types and raw user ids', () => {
    const item = toUiActivityItem(makeActivityItem())

    expect(item.object).toBe('projects.activity')
    expect(item.subjectType).toBe('work-item')
    expect(item.subjectLabel).toBe('issue_1')
    expect(item.actorLabel).toBe('user_eng')
    expect(item.summary).toBe('Status Changed: todo → in-progress')
  })

  it('falls back to project for unknown subject types', () => {
    const item = toUiActivityItem(
      makeActivityItem({ subjectType: 'mystery-thing' }),
    )

    expect(item.subjectType).toBe('project')
  })

  it('summarizes to-only and bare actions', () => {
    expect(
      toUiActivityItem(
        makeActivityItem({ fromValue: null, toValue: 'done', type: 'state' }),
      ).summary,
    ).toBe('State: done')
    expect(
      toUiActivityItem(
        makeActivityItem({ fromValue: null, toValue: null, type: 'created' }),
      ).summary,
    ).toBe('Created')
  })

  it('keeps null actor labels', () => {
    expect(
      toUiActivityItem(makeActivityItem({ actorUserId: null })).actorLabel,
    ).toBeNull()
  })
})

describe('toUiDiscussion', () => {
  it('maps the thread with no last-post timestamp', () => {
    const discussion = toUiDiscussion(makeDiscussion({ pinned: true }))

    expect(discussion.object).toBe('projects.discussion')
    expect(discussion.pinned).toBe(true)
    expect(discussion.lastPostAt).toBeNull()
    expect(discussion.postCount).toBe(2)
  })
})

describe('toUiDiscussionPost', () => {
  it('uses the raw user id as the author label', () => {
    expect(toUiDiscussionPost(makeDiscussionPost()).authorLabel).toBe(
      'user_eng',
    )
  })

  it('falls back to Unknown without an author', () => {
    expect(
      toUiDiscussionPost(makeDiscussionPost({ authorUserId: null }))
        .authorLabel,
    ).toBe('Unknown')
  })

  it('marks edited posts from the edit count', () => {
    expect(
      toUiDiscussionPost(makeDiscussionPost()).editedAt,
    ).toBeNull()
    expect(
      toUiDiscussionPost(
        makeDiscussionPost({ editCount: 1, updatedAt: 1700000100 }),
      ).editedAt,
    ).toBe(1700000100)
  })
})

describe('toUiWikiPage', () => {
  it('maps parent and revision count', () => {
    const page = toUiWikiPage(
      makeWikiPage({ parentPageId: 'wp_0', revisionCount: 4 }),
    )

    expect(page.parentId).toBe('wp_0')
    expect(page.currentRevision).toBe(4)
  })
})

describe('toUiWikiRevision', () => {
  it('numbers revisions newest-first from the page total', () => {
    const first = toUiWikiRevision(makeWikiRevision(), { index: 0, total: 3 })
    const last = toUiWikiRevision(makeWikiRevision(), { index: 2, total: 3 })

    expect(first.revision).toBe(3)
    expect(last.revision).toBe(1)
  })

  it('clamps the revision number at one', () => {
    expect(
      toUiWikiRevision(makeWikiRevision(), { index: 9, total: 3 }).revision,
    ).toBe(1)
  })

  it('falls back to Unknown without an author', () => {
    expect(
      toUiWikiRevision(makeWikiRevision({ authorUserId: null }), {
        index: 0,
        total: 1,
      }).authorLabel,
    ).toBe('Unknown')
  })
})

describe('toUiClientGrant', () => {
  it('maps invite and revoke timestamps', () => {
    const grant = toUiClientGrant(makeClientGrant({ revokedAt: 1700000100 }))

    expect(grant.userLabel).toBe('user_client')
    expect(grant.invitedAt).toBe(1700000000)
    expect(grant.revokedAt).toBe(1700000100)
  })
})
