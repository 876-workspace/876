/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { NotificationBell } from './notification-bell'

afterEach(cleanup)

describe('NotificationBell', () => {
  it('links to the notifications page without a badge when read up', () => {
    render(<NotificationBell count={0} />)

    expect(
      screen.getByRole('link', { name: 'Notifications' })
    ).toHaveAttribute('href', '/notifications')
    expect(
      document.querySelector('[data-slot="notification-bell-count"]')
    ).not.toBeInTheDocument()
  })

  it('announces the unread count and caps the badge at 99+', () => {
    const { rerender } = render(<NotificationBell count={3} />)

    expect(
      screen.getByRole('link', { name: 'Notifications, 3 unread' })
    ).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    rerender(<NotificationBell count={120} />)

    expect(screen.getByText('99+')).toBeInTheDocument()
  })
})
