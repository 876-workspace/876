// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { expect, it, vi } from 'vitest'

import { FeaturesToolbar } from './features-toolbar'

vi.mock('next/navigation', () => ({
  usePathname: () => '/apps/acme/features',
  useRouter: () => ({ refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

it('renders the feature-flags static heading and Add link', () => {
  render(<FeaturesToolbar slug="acme" />)

  expect(
    screen.getByRole('heading', { name: 'All Feature Flags' })
  ).toBeVisible()
  expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
    'href',
    '/apps/acme/features/new'
  )
})
