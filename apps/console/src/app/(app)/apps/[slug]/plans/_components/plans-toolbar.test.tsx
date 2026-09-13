// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { expect, it, vi } from 'vitest'

import { PlansToolbar } from './plans-toolbar'

vi.mock('next/navigation', () => ({
  usePathname: () => '/apps/acme/plans',
  useRouter: () => ({ refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

it('renders the plans static heading and Add link', () => {
  render(<PlansToolbar slug="acme" />)

  expect(screen.getByRole('heading', { name: 'All Plans' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
    'href',
    '/apps/acme/plans/new'
  )
})
