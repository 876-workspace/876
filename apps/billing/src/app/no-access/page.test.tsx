/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getWorkspaceContext: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/lib/auth/billing-context', () => ({
  getWorkspaceContext: mocks.getWorkspaceContext,
}))
vi.mock('@/lib/client/request', () => ({ request: vi.fn() }))

import NoAccessPage from './page'

describe('NoAccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects users with active Billing workspace access home', async () => {
    mocks.getWorkspaceContext.mockResolvedValue({ tenant: { id: 'tenant_1' } })

    await NoAccessPage()

    expect(mocks.redirect).toHaveBeenCalledWith('/')
  })

  it('renders the restriction message without workspace access', async () => {
    mocks.getWorkspaceContext.mockResolvedValue(null)

    render(await NoAccessPage())

    expect(
      screen.getByRole('heading', { name: 'Billing access is restricted' })
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /go to my 876 account/i })
    ).toBeTruthy()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})
