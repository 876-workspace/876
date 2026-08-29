/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

import { AccessPanel } from './access-panel'

function renderPanel(
  overrides: Partial<Parameters<typeof AccessPanel>[0]> = {}
) {
  const onRevoke = vi.fn()
  render(
    <AccessPanel
      permissions={['users:read', 'users:list']}
      onRevoke={onRevoke}
      {...overrides}
    />
  )
  return { onRevoke }
}

/** A permission pill, addressed by the key carried in its `title`. */
function pill(key: string) {
  return screen.getByTitle(key)
}

describe('AccessPanel', () => {
  describe('module rows', () => {
    it('keeps every permission collapsed until a module is expanded', () => {
      renderPanel()

      expect(screen.queryByTitle('users:read')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /Users/ }))

      expect(pill('users:read')).toBeInTheDocument()
    })

    it('expands every module from the Expand all control', () => {
      renderPanel()

      fireEvent.click(screen.getByRole('button', { name: 'Expand all' }))

      expect(pill('users:read')).toBeInTheDocument()
      expect(pill('organizations:read')).toBeInTheDocument()
    })

    it('reports the granted count against the module size on the trigger', () => {
      renderPanel()

      expect(
        within(screen.getByRole('button', { name: /Users/ })).getByText('2/6')
      ).toBeInTheDocument()
    })

    it('labels a held permission as granted and a withheld one as not granted', () => {
      renderPanel()

      fireEvent.click(screen.getByRole('button', { name: 'Expand all' }))

      expect(
        within(pill('users:read')).getByText('Granted')
      ).toBeInTheDocument()
      expect(
        within(pill('users:create')).getByText('Not granted')
      ).toBeInTheDocument()
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
