// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ActivityFeed } from './activity-feed'
import type { ActivityItem } from './types'

function makeItem(overrides?: Partial<ActivityItem>): ActivityItem {
  return {
    object: 'projects.activity',
    id: 'act_1',
    kind: 'work-item.created',
    subjectType: 'work-item',
    subjectId: 'wi_1',
    subjectLabel: 'Fix login',
    actorLabel: 'Alice',
    summary: 'Alice created the item',
    createdAt: Date.UTC(2026, 2, 4, 12) / 1000,
    ...overrides,
  }
}

const HREF_BASES = {
  project: '/projects',
  phase: '/phases',
  'work-item': '/work',
  timesheet: '/timesheets',
  'automation-run': '/runs',
  discussion: '/discussions',
  'wiki-page': '/wiki',
} as const

describe('ActivityFeed', () => {
  afterEach(cleanup)

  it('groups items by UTC day under a heading', () => {
    render(
      <ActivityFeed
        items={[
          makeItem({ createdAt: Date.UTC(2026, 2, 4, 12) / 1000 }),
          makeItem({ id: 'act_2', createdAt: Date.UTC(2026, 2, 4, 23) / 1000 }),
        ]}
        hrefBases={HREF_BASES}
        nextHref={null}
      />
    )

    const group = screen.getByRole('region', { name: 'Mar 4, 2026' })
    const heading = within(group).getByRole('heading', { name: 'Mar 4, 2026' })
    expect(heading).toBeInTheDocument()
    expect(within(group).getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders one group per UTC day', () => {
    render(
      <ActivityFeed
        items={[
          makeItem({ createdAt: Date.UTC(2026, 2, 4) / 1000 }),
          makeItem({ id: 'act_2', createdAt: Date.UTC(2026, 2, 5) / 1000 }),
        ]}
        hrefBases={HREF_BASES}
        nextHref={null}
      />
    )

    expect(
      screen.getByRole('region', { name: 'Mar 4, 2026' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Mar 5, 2026' })
    ).toBeInTheDocument()
  })

  it('links each subject with a trimmed base and encoded id', () => {
    render(
      <ActivityFeed
        items={[makeItem({ subjectId: 'wi/1 2' })]}
        hrefBases={{ ...HREF_BASES, 'work-item': '/work/' }}
        nextHref={null}
      />
    )

    expect(
      screen.getByRole('link', { name: 'Fix login' })
    ).toHaveAttribute('href', '/work/wi%2F1%202')
  })

  it('omits the actor line when actorLabel is null', () => {
    render(
      <ActivityFeed
        items={[makeItem({ actorLabel: null })]}
        hrefBases={HREF_BASES}
        nextHref={null}
      />
    )

    expect(screen.queryByText('Alice', { exact: true })).not.toBeInTheDocument()
    expect(screen.getByText('Alice created the item')).toBeInTheDocument()
  })

  it('renders the summary and actor when present', () => {
    render(
      <ActivityFeed
        items={[makeItem()]}
        hrefBases={HREF_BASES}
        nextHref={null}
      />
    )

    expect(screen.getByText('Alice created the item')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('renders the empty state when there are no items', () => {
    render(<ActivityFeed items={[]} hrefBases={HREF_BASES} nextHref={null} />)

    expect(screen.getByText('No activity yet')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('renders a Load more link when nextHref is provided', () => {
    render(
      <ActivityFeed
        items={[makeItem()]}
        hrefBases={HREF_BASES}
        nextHref="/activity/next"
      />
    )

    expect(
      screen.getByRole('link', { name: 'Load more' })
    ).toHaveAttribute('href', '/activity/next')
  })

  it('omits the Load more link when nextHref is null', () => {
    render(
      <ActivityFeed items={[makeItem()]} hrefBases={HREF_BASES} nextHref={null} />
    )

    expect(screen.queryByText('Load more')).not.toBeInTheDocument()
  })
})
