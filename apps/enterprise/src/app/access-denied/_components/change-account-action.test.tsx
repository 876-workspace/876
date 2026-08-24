import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
}))

vi.mock('@/lib/client/request', () => ({ request: mocks.request }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
}))

import { ChangeAccountAction } from './change-account-action'

describe('ChangeAccountAction — diff: clears consumer session before login (goldbergyoni AAA)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.request.mockResolvedValue({})
  })

  it('renders Change account button (a11y)', () => {
    render(<ChangeAccountAction />)
    const btn = screen.getByRole('button', { name: /change account/i })
    expect(btn).toBeVisible()
    expect(btn).toBeEnabled()
    expect(btn).toHaveAttribute('type', 'button')
  })

  it('shows busy state Signing out after click', async () => {
    let resolveReq!: (v: unknown) => void
    mocks.request.mockReturnValue(new Promise((r) => (resolveReq = r)))
    render(<ChangeAccountAction />)
    fireEvent.click(screen.getByRole('button', { name: /change account/i }))
    expect(screen.getByRole('button', { name: /signing out/i })).toBeVisible()
    expect(screen.getByRole('button')).toBeDisabled()
    resolveReq({})
    await waitFor(() => expect(mocks.replace).toHaveBeenCalled())
  })

  it('calls POST /api/auth/logout on click', async () => {
    render(<ChangeAccountAction />)
    fireEvent.click(screen.getByRole('button', { name: /change account/i }))
    await waitFor(() => expect(mocks.replace).toHaveBeenCalled())
    expect(mocks.request).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' })
    expect(mocks.request).toHaveBeenCalledTimes(1)
  })

  it('redirects via finally even when logout is slow (resilience)', async () => {
    let resolve!: (v: unknown) => void
    mocks.request.mockReturnValue(new Promise((r) => (resolve = r)))
    render(<ChangeAccountAction />)
    fireEvent.click(screen.getByRole('button', { name: /change account/i }))
    expect(mocks.replace).not.toHaveBeenCalled()
    resolve({})
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login?returnTo=/'))
  })

  it('redirects to /login?returnTo=/ on success', async () => {
    mocks.request.mockResolvedValue({})
    render(<ChangeAccountAction />)
    fireEvent.click(screen.getByRole('button', { name: /change account/i }))
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login?returnTo=/'))
  })

  it('is idempotent: second click while busy is ignored (no double request)', async () => {
    let resolveReq!: (v: unknown) => void
    mocks.request.mockReturnValue(new Promise((r) => (resolveReq = r)))
    render(<ChangeAccountAction />)
    const btn = screen.getByRole('button', { name: /change account/i })
    fireEvent.click(btn)
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(mocks.request).toHaveBeenCalledTimes(1)
    resolveReq({})
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledTimes(1))
  })

  it('has accessible type=button', () => {
    render(<ChangeAccountAction />)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('has rounded-full and font-semibold styling (design contract)', () => {
    const { container } = render(<ChangeAccountAction />)
    const btn = container.querySelector('button')
    expect(btn?.className).toMatch(/rounded-full/)
    expect(btn?.className).toMatch(/font-semibold/)
  })

  it('concurrent instances are isolated', async () => {
    const { unmount } = render(<ChangeAccountAction />)
    fireEvent.click(screen.getByRole('button', { name: /change account/i }))
    unmount()
    vi.clearAllMocks()
    mocks.request.mockResolvedValue({})
    render(<ChangeAccountAction />)
    expect(screen.getByRole('button', { name: /change account/i })).toBeVisible()
    expect(screen.getByRole('button')).toBeEnabled()
  })

  it('uses router.replace not push', async () => {
    render(<ChangeAccountAction />)
    fireEvent.click(screen.getByRole('button', { name: /change account/i }))
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login?returnTo=/'))
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('returnTo param is exactly "/" (not empty)', async () => {
    render(<ChangeAccountAction />)
    fireEvent.click(screen.getByRole('button', { name: /change account/i }))
    await waitFor(() => expect(mocks.replace).toHaveBeenCalled())
    const arg = mocks.replace.mock.calls[0]?.[0] as string
    expect(arg).toBe('/login?returnTo=/')
    expect(arg).not.toBe('/login?returnTo=')
  })
})
