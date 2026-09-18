import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AnnouncementRegion } from './announcement-region'
import { resetDismissedAnnouncements } from './dismissed-store'
import type { Announcement } from './types'

const updateState = vi.hoisted(() => ({
  updateAvailable: false,
  apply: vi.fn(),
}))

vi.mock('./use-app-update', () => ({
  useAppUpdate: () => updateState,
}))

function goOffline() {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: false,
  })
  window.dispatchEvent(new Event('offline'))
}

beforeEach(() => {
  vi.clearAllMocks()
  updateState.updateAvailable = false
  resetDismissedAnnouncements()
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(null, { status: 200 })))
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AnnouncementRegion', () => {
  it('renders nothing while online with no announcements', () => {
    const { container } = render(<AnnouncementRegion />)

    expect(container).toBeEmptyDOMElement()
  })

  it('shows an offline bar without replacing the page when the interface drops', async () => {
    render(
      <>
        <AnnouncementRegion />
        <main>Work in progress</main>
      </>
    )

    goOffline()

    expect(await screen.findByText('You are offline.')).toBeInTheDocument()
    expect(screen.getByText('Work in progress')).toBeInTheDocument()
  })

  it('does not offer to dismiss the offline bar', async () => {
    render(<AnnouncementRegion />)

    goOffline()

    await screen.findByText('You are offline.')
    expect(
      screen.queryByRole('button', { name: 'Dismiss announcement' })
    ).not.toBeInTheDocument()
  })

  it('removes the offline bar once a probe reaches the origin again', async () => {
    render(<AnnouncementRegion />)

    goOffline()
    await screen.findByText('You are offline.')

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    })
    window.dispatchEvent(new Event('online'))

    await waitFor(() =>
      expect(screen.queryByText('You are offline.')).not.toBeInTheDocument()
    )
  })

  it('applies a waiting service worker update from the bar action', async () => {
    const user = userEvent.setup()
    updateState.updateAvailable = true
    render(<AnnouncementRegion />)

    await user.click(await screen.findByRole('button', { name: 'Refresh' }))

    expect(updateState.apply).toHaveBeenCalledTimes(1)
  })

  it('renders a supplied announcement with a link action', () => {
    const announcements: Announcement[] = [
      {
        id: 'promo/launch',
        tone: 'promo',
        message: 'Couriers now supports pre-alerts.',
        actions: [{ label: 'Learn more', href: '/pre-alerts' }],
      },
    ]

    render(
      <AnnouncementRegion
        announcements={announcements}
        watchConnectivity={false}
        watchUpdates={false}
      />
    )

    expect(
      screen.getByText('Couriers now supports pre-alerts.')
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Learn more' })).toHaveAttribute(
      'href',
      '/pre-alerts'
    )
  })

  it('remembers a dismissal so the announcement does not return on remount', async () => {
    const user = userEvent.setup()
    const announcements: Announcement[] = [
      {
        id: 'promo/launch',
        tone: 'promo',
        message: 'Couriers now supports pre-alerts.',
        dismissible: true,
      },
    ]

    const { unmount } = render(
      <AnnouncementRegion
        announcements={announcements}
        watchConnectivity={false}
        watchUpdates={false}
      />
    )

    await user.click(
      screen.getByRole('button', { name: 'Dismiss announcement' })
    )
    expect(
      screen.queryByText('Couriers now supports pre-alerts.')
    ).not.toBeInTheDocument()

    unmount()
    render(
      <AnnouncementRegion
        announcements={announcements}
        watchConnectivity={false}
        watchUpdates={false}
      />
    )

    await waitFor(() =>
      expect(
        screen.queryByText('Couriers now supports pre-alerts.')
      ).not.toBeInTheDocument()
    )
  })

  it('sorts the offline bar above an editorial announcement', async () => {
    render(
      <AnnouncementRegion
        announcements={[
          { id: 'promo/launch', tone: 'promo', message: 'Promotion' },
        ]}
      />
    )

    goOffline()
    await screen.findByText('You are offline.')

    const bars = document.querySelectorAll('[data-announcement]')
    expect(
      Array.from(bars).map((bar) => bar.getAttribute('data-announcement'))
    ).toEqual(['connectivity/offline', 'promo/launch'])
  })
})
