/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  deleteFn: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
vi.mock('@/lib/client', () => ({
  client: { customers: { delete: mocks.deleteFn } },
}))

import { CustomerActions } from './customer-actions'

describe('CustomerActions — accessibility and semantics (extra)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Edit link has outline variant and contains an icon', () => {
    render(<CustomerActions orgSlug="org" id="cprof_1" />)
    const link = screen.getByRole('link', { name: /Edit/i })
    // outline buttons have border-border-strong class from buttonVariants
    expect(link.className).toMatch(/border-border-strong/)
    // svg icon present inside link
    expect(link.querySelector('svg')).toBeInTheDocument()
  })

  it('More actions trigger is a button with icon size', () => {
    render(<CustomerActions orgSlug="org" id="cprof_1" />)
    const trigger = screen.getByRole('button', { name: /More actions/i })
    expect(trigger).toHaveAttribute('aria-label', 'More actions')
    // size icon-sm triggers size-8 class
    expect(trigger.className).toMatch(/size-8/)
  })

  it('supports middle-click and cmd-click because it is a real anchor', async () => {
    render(<CustomerActions orgSlug="org" id="cprof_1" />)
    const link = screen.getByRole('link', {
      name: /Edit/i,
    }) as HTMLAnchorElement
    // real anchor allows native browser behaviors: href is present for aux-click
    expect(link.href).toContain('/org/customers/cprof_1/edit')
    expect(link.getAttribute('href')).toBe('/org/customers/cprof_1/edit')
  })

  it('encodes orgSlug and id in href (no double-encoding)', () => {
    render(<CustomerActions orgSlug="my-org" id="cprof_abc-123" />)
    expect(screen.getByRole('link', { name: /Edit/i })).toHaveAttribute(
      'href',
      '/my-org/customers/cprof_abc-123/edit'
    )
  })
})
