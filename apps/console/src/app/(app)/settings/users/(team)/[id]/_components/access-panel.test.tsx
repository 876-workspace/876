/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  revoke: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))

vi.mock('@/lib/client', () => ({
  client: { team: { revoke: mocks.revoke } },
}))

vi.mock('../../_lib/use-team-member-links', () => ({
  useTeamMemberLinks: () => (path: string) => path,
}))

import { AccessPanel } from './access-panel'

function renderPanel(
  overrides: Partial<Parameters<typeof AccessPanel>[0]> = {}
) {
  render(
    <AccessPanel
      memberId="user_123"
      permissions={['users:read', 'users:list']}
      canRevoke
      {...overrides}
    />
  )
}

/** A permission pill, addressed by the key carried in its `title`. */
function pill(key: string) {
  return screen.getByTitle(key)
}

describe('AccessPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.revoke.mockResolvedValue({ data: { count: 1 }, error: null })
  })

  describe('module rows', () => {
    it('keeps every permission collapsed until a module is expanded', () => {
      renderPanel()

      expect(screen.queryByTitle('users:read')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /Console/ }))
      fireEvent.click(screen.getByRole('button', { name: /Users/ }))

      expect(pill('users:read')).toBeInTheDocument()
    })

    it('reports the granted count against the module size on the trigger', () => {
      renderPanel()

      fireEvent.click(screen.getByRole('button', { name: /Console/ }))
      expect(
        within(screen.getByRole('button', { name: /Users/ })).getByText('2/6')
      ).toBeInTheDocument()
    })

    it('labels a held permission as granted and a withheld one as not granted', () => {
      renderPanel()

      fireEvent.click(screen.getByRole('button', { name: /Console/ }))
      fireEvent.click(screen.getByRole('button', { name: /Users/ }))

      expect(
        within(pill('users:read')).getByText('Granted')
      ).toBeInTheDocument()
      expect(
        within(pill('users:create')).getByText('Not granted')
      ).toBeInTheDocument()
    })
  })

  describe('revocation', () => {
    it('confirms and revokes access through the typed team client', async () => {
      renderPanel()

      fireEvent.click(screen.getByRole('button', { name: 'Revoke Access' }))
      expect(
        screen.getByRole('heading', { name: 'Revoke Console access?' })
      ).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Revoke access' }))

      await waitFor(() => expect(mocks.revoke).toHaveBeenCalledWith('user_123'))
      expect(mocks.push).toHaveBeenCalledWith('/settings/users')
      expect(mocks.refresh).toHaveBeenCalledTimes(1)
    })

    it('keeps a failed revocation visible beside the danger zone', async () => {
      mocks.revoke.mockResolvedValue({
        data: null,
        error: { code: 'team/last-super-admin', message: 'Protected grant.' },
      })
      renderPanel()

      fireEvent.click(screen.getByRole('button', { name: 'Revoke Access' }))
      fireEvent.click(screen.getByRole('button', { name: 'Revoke access' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Protected grant.'
      )
      expect(mocks.push).not.toHaveBeenCalled()
    })

    it('replaces the revoke button with a locked notice when not permitted', () => {
      renderPanel({ canRevoke: false })

      expect(
        screen.queryByRole('button', { name: 'Revoke Access' })
      ).not.toBeInTheDocument()
      expect(screen.getByText('Not permitted')).toBeInTheDocument()
      expect(mocks.revoke).not.toHaveBeenCalled()
    })
  })
})
