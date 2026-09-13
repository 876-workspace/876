/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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

import { PaymentsSection } from './payments-section'

describe('PaymentsSection', () => {
  it('keeps Add available while a payment record is open', () => {
    render(<PaymentsSection list={null}>{null}</PaymentsSection>)

    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/payments/new'
    )
  })
})
