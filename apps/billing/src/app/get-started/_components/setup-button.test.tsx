/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('@/lib/client/request', () => ({ request: mocks.request }))

import { SetupButton } from './setup-button'

describe('SetupButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.request.mockResolvedValue({
      data: { alreadyActive: false },
      error: null,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('activates an existing workspace before navigating to Billing', async () => {
    const user = userEvent.setup()
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    render(<SetupButton workspaceExists />)

    await user.click(
      screen.getByRole('button', { name: 'Activate 876 Billing' })
    )

    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1))
    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith('/api/activate', {
      method: 'POST',
    })
    expect(assign).toHaveBeenCalledWith('/')
  })

  it('does not navigate when activation of an existing workspace fails', async () => {
    const user = userEvent.setup()
    const assign = vi.fn()
    mocks.request.mockResolvedValue({
      data: null,
      error: { code: 'subscription/unavailable', message: 'Try again.' },
    })
    vi.stubGlobal('location', { ...window.location, assign })
    render(<SetupButton workspaceExists />)

    await user.click(
      screen.getByRole('button', { name: 'Activate 876 Billing' })
    )

    await screen.findByText('Try again.')
    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith('/api/activate', {
      method: 'POST',
    })
    expect(assign).not.toHaveBeenCalled()
  })
  it('activates before creating the workspace when there is none yet', async () => {
    const user = userEvent.setup()
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    render(
      <SetupButton
        workspaceExists={false}
        name="Island Logistics"
        slug="island-logistics-billing"
        defaultCurrency="JMD"
      />
    )

    await user.click(
      screen.getByRole('button', { name: 'Set up Billing workspace' })
    )

    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1))
    expect(mocks.request).toHaveBeenCalledTimes(2)
    // Activation first: a workspace created before the entitlement exists is a
    // workspace its owner cannot open.
    expect(mocks.request).toHaveBeenNthCalledWith(1, '/api/activate', {
      method: 'POST',
    })
    expect(mocks.request).toHaveBeenNthCalledWith(2, '/api/v1/tenants', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Island Logistics',
        slug: 'island-logistics-billing',
        defaultCurrency: 'JMD',
      }),
    })
    expect(assign).toHaveBeenCalledWith('/')
  })

  it('does not create a workspace when activation fails', async () => {
    const user = userEvent.setup()
    const assign = vi.fn()
    mocks.request.mockResolvedValue({
      data: null,
      error: { code: 'subscription/unavailable', message: 'Try again.' },
    })
    vi.stubGlobal('location', { ...window.location, assign })
    render(
      <SetupButton
        workspaceExists={false}
        name="Island Logistics"
        slug="island-logistics-billing"
        defaultCurrency="JMD"
      />
    )

    await user.click(
      screen.getByRole('button', { name: 'Set up Billing workspace' })
    )

    await screen.findByText('Try again.')
    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).not.toHaveBeenCalledWith(
      '/api/v1/tenants',
      expect.anything()
    )
    expect(assign).not.toHaveBeenCalled()
  })
})
