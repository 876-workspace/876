/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ProjectNotification } from '@876/projects-ui/automation/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ markRead: vi.fn() }))

vi.mock('@/lib/client', () => ({
  notificationsClient: { markRead: mocks.markRead },
}))

const { NotificationsManager } = await import('./notifications-manager')

function makeNotification(
  overrides: Partial<ProjectNotification> = {}
): ProjectNotification {
  return {
    object: 'projects.notification',
    id: 'ntf_1',
    subjectType: 'work-item',
    subjectId: 'PROJ-1',
    title: 'State changed',
    body: null,
    read: false,
    createdAt: 1,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.markRead.mockResolvedValue({
    data: { object: 'projects.notification', id: 'ntf_1' },
    error: null,
  })
})

afterEach(cleanup)

describe('NotificationsManager', () => {
  it('counts unread notifications', () => {
    render(
      <NotificationsManager
        initial={[
          makeNotification(),
          makeNotification({ id: 'ntf_2', read: true }),
        ]}
        hrefFor={{ 'work-item': '/issues' }}
      />
    )

    expect(screen.getByText('1 unread notification')).toBeInTheDocument()
  })

  it('marks a notification read and updates the count', async () => {
    render(
      <NotificationsManager
        initial={[makeNotification()]}
        hrefFor={{ 'work-item': '/issues' }}
      />
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Mark “State changed” as read' })
    )

    expect(mocks.markRead).toHaveBeenCalledWith('ntf_1')
    expect(await screen.findByText('All caught up')).toBeInTheDocument()
  })

  it('shows an AppError when marking read fails', async () => {
    mocks.markRead.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Down.' },
    })
    render(
      <NotificationsManager
        initial={[makeNotification()]}
        hrefFor={{ 'work-item': '/issues' }}
      />
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Mark “State changed” as read' })
    )

    expect(await screen.findByText('Notification not updated')).toBeInTheDocument()
  })
})
