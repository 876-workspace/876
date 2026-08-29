/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

import { PERMISSION_GROUPS } from '@/lib/permissions'
import { AccessPanel } from './access-panel'

const ALL_KEYS = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.value)
)

function renderPanel(
  overrides: Partial<Parameters<typeof AccessPanel>[0]> = {}
) {
  const onRevoke = vi.fn()
  render(
    <AccessPanel
      role="admin"
      roleLabel="Admin"
      permissions={['users:read', 'users:list']}
      onRevoke={onRevoke}
      {...overrides}
    />
  )
  return { onRevoke }
}

describe('AccessPanel', () => {
  describe('filtering', () => {
    it('hides modules with no permission matching the query', () => {
      renderPanel()

      fireEvent.change(
        screen.getByRole('searchbox', { name: 'Filter permissions' }),
        { target: { value: 'organizations:read' } }
      )

      expect(screen.getByText('organizations:read')).toBeInTheDocument()
      expect(screen.queryByText('users:read')).not.toBeInTheDocument()
    })

    it('shows an empty state and a reset when nothing matches', () => {
      renderPanel()

      fireEvent.change(
        screen.getByRole('searchbox', { name: 'Filter permissions' }),
        { target: { value: 'zzzz-no-such-permission' } }
      )

      expect(screen.getByText('No matching permissions')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

      expect(
        screen.queryByText('No matching permissions')
      ).not.toBeInTheDocument()
    })

    it('narrows to held permissions under the Granted scope', () => {
      renderPanel()

      fireEvent.click(screen.getByRole('button', { name: 'Granted' }))

      expect(screen.getByText('users:read')).toBeInTheDocument()
      expect(screen.queryByText('users:create')).not.toBeInTheDocument()
    })

    it('narrows to withheld permissions under the Denied scope', () => {
      renderPanel()

      fireEvent.click(screen.getByRole('button', { name: 'Denied' }))

      expect(screen.getByText('users:create')).toBeInTheDocument()
      expect(screen.queryByText('users:read')).not.toBeInTheDocument()
    })

    it('disables Expand all while a scope filter is active', () => {
      renderPanel()

      fireEvent.click(screen.getByRole('button', { name: 'Granted' }))

      expect(
        screen.getByRole('button', { name: /Collapse all|Expand all/ })
      ).toBeDisabled()
    })
  })

  describe('module rows', () => {
    it('keeps every permission collapsed until a module is expanded', () => {
      renderPanel()

      expect(screen.queryByText('users:read')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /Users/ }))

      expect(screen.getByText('users:read')).toBeInTheDocument()
    })

    it('expands every module from the Expand all control', () => {
      renderPanel()

      fireEvent.click(screen.getByRole('button', { name: 'Expand all' }))

      expect(screen.getByText('users:read')).toBeInTheDocument()
      expect(screen.getByText('organizations:read')).toBeInTheDocument()
    })

    it('labels a held permission as granted and a withheld one as not granted', () => {
      renderPanel()

      fireEvent.click(screen.getByRole('button', { name: 'Expand all' }))

      const granted = screen.getByText('users:read').closest('li')
      const denied = screen.getByText('users:create').closest('li')

      expect(within(granted!).getByText('Granted')).toBeInTheDocument()
      expect(within(denied!).getByText('Not granted')).toBeInTheDocument()
    })
  })

  describe('revocation', () => {
    it('calls onRevoke exactly once when the revoke button is pressed', () => {
      const { onRevoke } = renderPanel()

      fireEvent.click(screen.getByRole('button', { name: 'Revoke Access' }))

      expect(onRevoke).toHaveBeenCalledTimes(1)
    })

    it('disables the revoke button while a revocation is in flight', () => {
      renderPanel({ revoking: true })

      expect(screen.getByRole('button', { name: 'Revoking…' })).toBeDisabled()
    })

    it('replaces the revoke button with a locked notice when not permitted', () => {
      const { onRevoke } = renderPanel({ canRevoke: false })

      expect(
        screen.queryByRole('button', { name: 'Revoke Access' })
      ).not.toBeInTheDocument()
      expect(screen.getByText('Not permitted')).toBeInTheDocument()
      expect(onRevoke).not.toHaveBeenCalled()
    })
  })
})
