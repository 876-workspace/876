// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppsToolbar } from './apps-toolbar'

vi.mock('next/navigation', () => ({
  usePathname: () => '/apps',
  useRouter: () => ({ refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

afterEach(() => {
  cleanup()
})

describe('Console list toolbars', () => {
  it('renders the Apps status heading and Add link', () => {
    render(<AppsToolbar status="all" />)

    expect(screen.getByRole('heading', { name: 'All Apps' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/apps/new'
    )
  })

  it('renders Refresh, Import, and Export in the Apps actions menu', () => {
    render(<AppsToolbar status="all" />)

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))

    expect(screen.getByText('Refresh')).toBeInTheDocument()
    expect(screen.getByText('Import')).toBeInTheDocument()
    expect(screen.getByText('Export')).toBeInTheDocument()
  })
})
