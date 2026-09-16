// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DiscussionList } from './discussion-list'
import type { Discussion } from './types'

function makeDiscussion(overrides?: Partial<Discussion>): Discussion {
  return {
    object: 'projects.discussion',
    id: 'disc_1',
    projectId: 'p_1',
    title: 'Kickoff planning',
    pinned: false,
    locked: false,
    clientVisible: false,
    postCount: 3,
    lastPostAt: Date.UTC(2026, 2, 6) / 1000,
    createdAt: Date.UTC(2026, 2, 4) / 1000,
    ...overrides,
  }
}

describe('DiscussionList', () => {
  afterEach(cleanup)

  it('links each discussion by id under the hrefBase', () => {
    render(
      <DiscussionList
        discussions={[makeDiscussion()]}
        hrefBase="/projects/p_1/discussions"
      />
    )

    expect(
      screen.getByRole('link', { name: 'Kickoff planning' })
    ).toHaveAttribute('href', '/projects/p_1/discussions/disc_1')
  })

  it('trims the hrefBase slash and encodes the id', () => {
    render(
      <DiscussionList
        discussions={[makeDiscussion({ id: 'disc/1 2' })]}
        hrefBase="/discussions/"
      />
    )

    expect(
      screen.getByRole('link', { name: 'Kickoff planning' })
    ).toHaveAttribute('href', '/discussions/disc%2F1%202')
  })

  it('shows the pinned badge for a pinned discussion', () => {
    render(
      <DiscussionList
        discussions={[makeDiscussion({ pinned: true })]}
        hrefBase="/discussions"
      />
    )

    expect(screen.getByText('Pinned')).toBeInTheDocument()
  })

  it('shows the locked badge for a locked discussion', () => {
    render(
      <DiscussionList
        discussions={[makeDiscussion({ locked: true })]}
        hrefBase="/discussions"
      />
    )

    expect(screen.getByText('Locked')).toBeInTheDocument()
  })

  it('shows the client visible badge only when clientVisible', () => {
    render(
      <DiscussionList
        discussions={[makeDiscussion({ clientVisible: true })]}
        hrefBase="/discussions"
      />
    )

    expect(screen.getByText('Client visible')).toBeInTheDocument()
  })

  it('omits the client visible badge when not client visible', () => {
    render(
      <DiscussionList
        discussions={[makeDiscussion({ clientVisible: false })]}
        hrefBase="/discussions"
      />
    )

    expect(screen.queryByText('Client visible')).not.toBeInTheDocument()
  })

  it('renders the post count with pluralization', () => {
    render(
      <DiscussionList
        discussions={[makeDiscussion({ postCount: 1 })]}
        hrefBase="/discussions"
      />
    )

    expect(screen.getByText('1 post')).toBeInTheDocument()
  })

  it('renders plural posts above one', () => {
    render(
      <DiscussionList
        discussions={[makeDiscussion({ postCount: 3 })]}
        hrefBase="/discussions"
      />
    )

    expect(screen.getByText('3 posts')).toBeInTheDocument()
  })

  it('renders created and last post dates', () => {
    render(
      <DiscussionList
        discussions={[makeDiscussion()]}
        hrefBase="/discussions"
      />
    )

    expect(screen.getByText('Created Mar 4, 2026')).toBeInTheDocument()
    expect(screen.getByText('Last post Mar 6, 2026')).toBeInTheDocument()
  })

  it('omits the last post date when there are no posts', () => {
    render(
      <DiscussionList
        discussions={[makeDiscussion({ lastPostAt: null })]}
        hrefBase="/discussions"
      />
    )

    expect(screen.queryByText(/^Last post/)).not.toBeInTheDocument()
  })

  it('renders the empty state', () => {
    render(<DiscussionList discussions={[]} hrefBase="/discussions" />)

    expect(screen.getByText('No discussions yet')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
