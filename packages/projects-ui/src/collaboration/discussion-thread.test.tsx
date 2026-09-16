// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DiscussionThread } from './discussion-thread'
import type { Discussion, DiscussionPost } from './types'

function makeDiscussion(overrides?: Partial<Discussion>): Discussion {
  return {
    object: 'projects.discussion',
    id: 'disc_1',
    projectId: 'p_1',
    title: 'Kickoff planning',
    pinned: false,
    locked: false,
    clientVisible: false,
    postCount: 2,
    lastPostAt: null,
    createdAt: Date.UTC(2026, 2, 4) / 1000,
    ...overrides,
  }
}

function makePost(overrides?: Partial<DiscussionPost>): DiscussionPost {
  return {
    object: 'projects.discussion-post',
    id: 'post_1',
    authorLabel: 'Alice',
    bodyMarkdown: 'Hello **world**',
    editedAt: null,
    createdAt: Date.UTC(2026, 2, 4, 12) / 1000,
    ...overrides,
  }
}

describe('DiscussionThread', () => {
  afterEach(cleanup)

  it('renders the discussion title as a heading', () => {
    render(
      <DiscussionThread
        discussion={makeDiscussion()}
        posts={[makePost()]}
        replyAction="/discussions/disc_1/reply"
      />
    )

    expect(
      screen.getByRole('heading', { name: 'Kickoff planning' })
    ).toBeInTheDocument()
  })

  it('shows the pinned and locked badges when set', () => {
    render(
      <DiscussionThread
        discussion={makeDiscussion({ pinned: true, locked: true })}
        posts={[makePost()]}
        replyAction="/reply"
      />
    )

    expect(screen.getByText('Pinned')).toBeInTheDocument()
    expect(screen.getByText('Locked')).toBeInTheDocument()
  })

  it('omits the badges when not pinned or locked', () => {
    render(
      <DiscussionThread
        discussion={makeDiscussion()}
        posts={[makePost()]}
        replyAction="/reply"
      />
    )

    expect(screen.queryByText('Pinned')).not.toBeInTheDocument()
    expect(screen.queryByText('Locked')).not.toBeInTheDocument()
  })

  it('renders post markdown through the real Markdown renderer', () => {
    render(
      <DiscussionThread
        discussion={makeDiscussion()}
        posts={[makePost()]}
        replyAction="/reply"
      />
    )

    const article = screen.getByRole('article')
    expect(within(article).getByText('world').tagName).toBe('STRONG')
  })

  it('renders the post author and created date', () => {
    render(
      <DiscussionThread
        discussion={makeDiscussion()}
        posts={[makePost()]}
        replyAction="/reply"
      />
    )

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Posted Mar 4, 2026')).toBeInTheDocument()
    expect(screen.queryByText(/Edited/)).not.toBeInTheDocument()
  })

  it('renders the edited date only when edited', () => {
    render(
      <DiscussionThread
        discussion={makeDiscussion()}
        posts={[
          makePost(),
          makePost({
            id: 'post_2',
            authorLabel: 'Bob',
            editedAt: Date.UTC(2026, 2, 5) / 1000,
          }),
        ]}
        replyAction="/reply"
      />
    )

    expect(screen.getByText('Edited Mar 5, 2026')).toBeInTheDocument()
  })

  it('renders the empty posts state', () => {
    render(
      <DiscussionThread
        discussion={makeDiscussion()}
        posts={[]}
        replyAction="/reply"
      />
    )

    expect(screen.getByText('No posts yet')).toBeInTheDocument()
  })

  it('renders the reply form posting to replyAction', () => {
    render(
      <DiscussionThread
        discussion={makeDiscussion()}
        posts={[makePost()]}
        replyAction="/discussions/disc_1/reply"
      />
    )

    const form = document.querySelector('form')
    expect(form).toHaveAttribute('action', '/discussions/disc_1/reply')
    expect(form).toHaveAttribute('method', 'post')
  })

  it('names the reply textarea bodyMarkdown and requires it', () => {
    render(
      <DiscussionThread
        discussion={makeDiscussion()}
        posts={[makePost()]}
        replyAction="/reply"
      />
    )

    const textarea = screen.getByLabelText('Reply')
    expect(textarea).toHaveAttribute('name', 'bodyMarkdown')
    expect(textarea).toBeRequired()
  })

  it('labels textareas uniquely even for two instances of the same discussion', () => {
    render(
      <>
        <DiscussionThread
          discussion={makeDiscussion()}
          posts={[]}
          replyAction="/reply"
        />
        <DiscussionThread
          discussion={makeDiscussion()}
          posts={[]}
          replyAction="/reply"
        />
      </>
    )

    const textareas = screen.getAllByRole('textbox', { name: 'Reply' })
    expect(textareas).toHaveLength(2)
    expect(new Set(textareas.map((textarea) => textarea.id)).size).toBe(2)
    for (const textarea of textareas) {
      expect(textarea.id).not.toBe('')
      expect(screen.getAllByLabelText('Reply')).toContain(textarea)
    }
  })

  it('disables the textarea and button when locked', () => {
    render(
      <DiscussionThread
        discussion={makeDiscussion({ locked: true })}
        posts={[makePost()]}
        replyAction="/reply"
      />
    )

    expect(screen.getByLabelText('Reply')).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Reply' })
    ).toBeDisabled()
  })

  it('keeps the reply form enabled when not locked', () => {
    render(
      <DiscussionThread
        discussion={makeDiscussion()}
        posts={[makePost()]}
        replyAction="/reply"
      />
    )

    expect(screen.getByLabelText('Reply')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Reply' })).toBeEnabled()
  })
})
