// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { NotificationList } from './notification-list'
import type { ProjectNotification } from './types'

function makeNotification(
  overrides?: Partial<ProjectNotification>
): ProjectNotification {
  return {
    object: 'projects.notification',
    id: 'notif_1',
    subjectType: 'work-item',
    subjectId: 'wi_1',
    title: 'Review requested',
    body: 'Alice asked for a review',
    read: false,
    createdAt: Date.UTC(2026, 2, 4) / 1000,
    ...overrides,
  }
}

const HREF_FOR = { 'work-item': '/work', phase: '/phases' }

describe('NotificationList', () => {
  afterEach(cleanup)

  it('renders the notification title', () => {
    render(
      <NotificationList notifications={[makeNotification()]} hrefFor={HREF_FOR} />
    )

    expect(screen.getByText('Review requested')).toBeInTheDocument()
  })

  it('marks an unread notification', () => {
    render(
      <NotificationList notifications={[makeNotification()]} hrefFor={HREF_FOR} />
    )

    expect(screen.getByText('Unread')).toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="notification-list-item"]')
    ).toHaveAttribute('data-read', 'false')
  })

  it('marks a read notification without an unread badge', () => {
    render(
      <NotificationList
        notifications={[makeNotification({ read: true })]}
        hrefFor={HREF_FOR}
      />
    )

    expect(screen.queryByText('Unread')).not.toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="notification-list-item"]')
    ).toHaveAttribute('data-read', 'true')
  })

  it('emphasizes an unread title', () => {
    render(
      <NotificationList notifications={[makeNotification()]} hrefFor={HREF_FOR} />
    )

    expect(screen.getByRole('link', { name: 'Review requested' })).toHaveClass(
      'font-semibold'
    )
  })

  it('mutes a read title', () => {
    render(
      <NotificationList
        notifications={[makeNotification({ read: true })]}
        hrefFor={HREF_FOR}
      />
    )

    expect(screen.getByRole('link', { name: 'Review requested' })).toHaveClass(
      'text-muted-foreground'
    )
  })

  it('links the subject through the hrefFor map', () => {
    render(
      <NotificationList notifications={[makeNotification()]} hrefFor={HREF_FOR} />
    )

    expect(
      screen.getByRole('link', { name: 'Review requested' })
    ).toHaveAttribute('href', '/work/wi_1')
  })

  it('encodes the subject id', () => {
    render(
      <NotificationList
        notifications={[makeNotification({ subjectId: 'wi/1 2' })]}
        hrefFor={HREF_FOR}
      />
    )

    expect(
      screen.getByRole('link', { name: 'Review requested' })
    ).toHaveAttribute('href', '/work/wi%2F1%202')
  })

  it('renders plain text when the subject type has no base href', () => {
    render(
      <NotificationList
        notifications={[
          makeNotification({ subjectType: 'budget', subjectId: 'b_1' }),
        ]}
        hrefFor={HREF_FOR}
      />
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Review requested')).toBeInTheDocument()
  })

  it('renders the body when present', () => {
    render(
      <NotificationList notifications={[makeNotification()]} hrefFor={HREF_FOR} />
    )

    expect(screen.getByText('Alice asked for a review')).toBeInTheDocument()
  })

  it('omits the body paragraph when absent', () => {
    const { container } = render(
      <NotificationList
        notifications={[makeNotification({ body: null })]}
        hrefFor={HREF_FOR}
      />
    )

    expect(container.querySelectorAll('p')).toHaveLength(0)
  })

  it('renders the created date', () => {
    render(
      <NotificationList notifications={[makeNotification()]} hrefFor={HREF_FOR} />
    )

    expect(screen.getByText('Mar 4, 2026')).toBeInTheDocument()
  })

  it('renders one row per notification', () => {
    render(
      <NotificationList
        notifications={[
          makeNotification(),
          makeNotification({ id: 'notif_2', title: 'Due soon' }),
        ]}
        hrefFor={HREF_FOR}
      />
    )

    expect(
      within(screen.getByRole('list')).getAllByRole('listitem')
    ).toHaveLength(2)
  })

  it('renders the empty state', () => {
    render(<NotificationList notifications={[]} hrefFor={HREF_FOR} />)

    expect(screen.getByText('No notifications yet')).toBeInTheDocument()
  })
})
