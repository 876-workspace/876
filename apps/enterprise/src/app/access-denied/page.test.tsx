import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./_components/change-account-action', () => ({
  ChangeAccountAction: () => <button>Change account</button>,
}))

import AccessDeniedPage from './page'

describe('AccessDeniedPage — consumer blocked (diff: rendered not redirect)', () => {
  it('blocks consumer without linking to consumer app (core diff)', () => {
    render(<AccessDeniedPage />)
    expect(screen.getByText('This workspace needs a work account')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Change account' })).toBeVisible()
    expect(screen.queryByText('Go to my 876 account')).not.toBeInTheDocument()
  })
  it('renders main landmark with heading (a11y)', () => {
    render(<AccessDeniedPage />)
    const main = screen.getByRole('main')
    expect(within(main).getByRole('heading', { level: 1, name: 'This workspace needs a work account' })).toBeVisible()
  })
  it('explains why: personal 876 account vs Enterprise', () => {
    render(<AccessDeniedPage />)
    expect(screen.getByText(/personal 876 account/)).toBeVisible()
    expect(screen.getByText(/Enterprise account/)).toBeVisible()
  })
  it('instructs next step: Sign out then sign in', () => {
    render(<AccessDeniedPage />)
    expect(screen.getByText(/Sign out, then sign in/)).toBeVisible()
  })
  it('contains Change account button exactly once', () => {
    render(<AccessDeniedPage />)
    expect(screen.getAllByRole('button', { name: 'Change account' })).toHaveLength(1)
  })
  it('does not render any anchor', () => {
    render(<AccessDeniedPage />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(document.body.innerHTML).not.toMatch(/localhost:3000/)
  })
  it('does not mention legacy /register', () => {
    render(<AccessDeniedPage />)
    expect(document.body.textContent).not.toContain('/register')
  })
  it('is static render — does not throw redirect', () => {
    expect(() => render(<AccessDeniedPage />)).not.toThrow()
  })
  it('is sync function (not async)', () => {
    expect(AccessDeniedPage.length).toBe(0)
  })
  it('renders centered card layout', () => {
    const { container } = render(<AccessDeniedPage />)
    expect(container.querySelector('section')?.className).toMatch(/max-w-md/)
  })
  it('has border styling', () => {
    const { container } = render(<AccessDeniedPage />)
    expect(container.querySelector('section')?.className).toMatch(/border/)
  })
  it('is idempotent', () => {
    const { unmount } = render(<AccessDeniedPage />)
    const first = screen.getByText('This workspace needs a work account').textContent
    unmount()
    render(<AccessDeniedPage />)
    expect(screen.getByText('This workspace needs a work account').textContent).toBe(first)
  })
  it('ChangeAccountAction is inside main', () => {
    const { container } = render(<AccessDeniedPage />)
    const main = container.querySelector('main')
    expect(main?.contains(screen.getByRole('button', { name: 'Change account' }))).toBe(true)
  })
  it('does not expose realm/crossRealm', () => {
    render(<AccessDeniedPage />)
    expect(document.body.textContent).not.toMatch(/crossRealm/)
  })
  it('main has background classes', () => {
    const { container } = render(<AccessDeniedPage />)
    expect(container.querySelector('main')?.className).toMatch(/bg-background/)
  })
  it('paragraph has muted foreground', () => {
    const { container } = render(<AccessDeniedPage />)
    expect(container.querySelector('p')?.className).toMatch(/text-muted-foreground/)
  })
  it('heading has tracking style', () => {
    const { container } = render(<AccessDeniedPage />)
    expect(container.querySelector('h1')?.className).toMatch(/tracking/)
  })
})
