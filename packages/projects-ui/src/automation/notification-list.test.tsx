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

function mobileList(container: HTMLElement): HTMLElement {
  const list = container.querySelector('ul')
  if (!list) throw new Error('Expected a mobile list')
  return list as HTMLElement
}

function mobileRows(container: HTMLElement): HTMLElement[] {
  return [...mobileList(container).querySelectorAll<HTMLElement>(':scope > li')]
}

function mobileMeta(row: HTMLElement): HTMLElement | null {
  return row.querySelector('[data-cell-content] > div > span')
}

function desktopList(): HTMLElement {
  const list = document.querySelector('[data-slot="notification-list"]')
  if (!list) throw new Error('Expected the desktop list')
  return list as HTMLElement
}

describe('NotificationList', () => {
  afterEach(cleanup)

  it('renders the notification title in the phone row and the desktop row', () => {
    const { container } = render(
      <NotificationList
        notifications={[makeNotification()]}
        hrefFor={HREF_FOR}
      />
    )

    expect(
      within(mobileList(container)).getByText('Review requested')
    ).toBeInTheDocument()
    expect(
      within(desktopList()).getByText('Review requested')
    ).toBeInTheDocument()
  })

  it('marks an unread notification', () => {
    render(
      <NotificationList
        notifications={[makeNotification()]}
        hrefFor={HREF_FOR}
      />
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
      <NotificationList
        notifications={[makeNotification()]}
        hrefFor={HREF_FOR}
      />
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
      <NotificationList
        notifications={[makeNotification()]}
        hrefFor={HREF_FOR}
      />
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
    const { container } = render(
      <NotificationList
        notifications={[
          makeNotification({ subjectType: 'budget', subjectId: 'b_1' }),
        ]}
        hrefFor={HREF_FOR}
      />
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(within(mobileList(container)).queryByRole('link')).toBeNull()
    expect(
      within(desktopList()).getByText('Review requested')
    ).toBeInTheDocument()
  })

  it('renders the body when present', () => {
    const { container } = render(
      <NotificationList
        notifications={[makeNotification()]}
        hrefFor={HREF_FOR}
      />
    )

    expect(
      within(mobileList(container)).getByText('Alice asked for a review')
    ).toBeInTheDocument()
    expect(
      within(desktopList()).getByText('Alice asked for a review')
    ).toBeInTheDocument()
  })

  it('omits the body paragraph when absent', () => {
    const { container } = render(
      <NotificationList
        notifications={[makeNotification({ body: null })]}
        hrefFor={HREF_FOR}
      />
    )

    const item = document.querySelector('[data-slot="notification-list-item"]')
    expect(item?.querySelectorAll('p')).toHaveLength(0)
    expect(mobileList(container).querySelectorAll('p')).toHaveLength(1)
  })

  it('renders the created date', () => {
    const { container } = render(
      <NotificationList
        notifications={[makeNotification()]}
        hrefFor={HREF_FOR}
      />
    )

    expect(
      within(mobileList(container)).getByText('Mar 4, 2026')
    ).toBeInTheDocument()
    expect(within(desktopList()).getByText('Mar 4, 2026')).toBeInTheDocument()
  })

  it('renders one row per notification', () => {
    const { container } = render(
      <NotificationList
        notifications={[
          makeNotification(),
          makeNotification({ id: 'notif_2', title: 'Due soon' }),
        ]}
        hrefFor={HREF_FOR}
      />
    )

    expect(within(mobileList(container)).getAllByRole('listitem')).toHaveLength(
      2
    )
    expect(within(desktopList()).getAllByRole('listitem')).toHaveLength(2)
  })

  it('links a phone row through the hrefFor map', () => {
    const { container } = render(
      <NotificationList
        notifications={[makeNotification()]}
        hrefFor={HREF_FOR}
      />
    )

    expect(
      within(mobileList(container)).getByRole('link', {
        name: 'View notification Review requested',
      })
    ).toHaveAttribute('href', '/work/wi_1')
  })

  it('shows the notification date as the meta of its phone row', () => {
    const { container } = render(
      <NotificationList
        notifications={[
          makeNotification(),
          makeNotification({ id: 'notif_2', title: 'Due soon' }),
        ]}
        hrefFor={HREF_FOR}
      />
    )

    const rows = mobileRows(container)
    expect(rows).toHaveLength(2)
    expect(mobileMeta(rows[0])).toHaveTextContent('Mar 4, 2026')
    expect(mobileMeta(rows[1])).toHaveTextContent('Mar 4, 2026')
    expect(within(rows[1]).getByText('Due soon')).toBeInTheDocument()
  })

  it('renders the empty state', () => {
    render(<NotificationList notifications={[]} hrefFor={HREF_FOR} />)

    expect(screen.getByText('No notifications yet')).toBeInTheDocument()
  })
})
