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

import { BankingSection } from './banking-section'

describe('BankingSection', () => {
  it('keeps Add available while a bank account record is open', () => {
    render(<BankingSection list={null}>{null}</BankingSection>)

    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/banking/new'
    )
  })
})
