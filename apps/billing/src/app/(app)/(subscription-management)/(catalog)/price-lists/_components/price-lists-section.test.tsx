/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@876/ui/list-detail-section', () => ({
  ListDetailSection: ({ toolbar }: { toolbar: React.ReactNode }) => toolbar,
}))
vi.mock('@876/ui/list-detail-shell', () => ({
  useListDetailRoute: () => ({ open: true }),
}))
vi.mock('@/components/patterns/streaming-resource-toolbar', () => ({
  StreamingResourceToolbar: ({ primary }: { primary?: { href: string } }) =>
    primary ? <a href={primary.href}>Add</a> : null,
}))

import { PriceListsSection } from './price-lists-section'

describe('PriceListsSection', () => {
  it('keeps Add available while a price list record is open', () => {
    render(<PriceListsSection list={null}>{null}</PriceListsSection>)

    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/price-lists/new'
    )
  })
})
