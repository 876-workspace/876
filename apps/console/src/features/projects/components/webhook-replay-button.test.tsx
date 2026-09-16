// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { WebhookReplayButton } from './webhook-replay-button'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('WebhookReplayButton', () => {
  it('posts to the Console replay route for the delivery', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'whdl_1' }, error: null }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <WebhookReplayButton organizationId="org_1" deliveryId="whdl_1" />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/organizations/org_1/projects/webhook-deliveries/whdl_1/replay',
        { method: 'POST' }
      )
    })
    expect(screen.getByRole('button', { name: 'Replayed' })).toBeDisabled()
  })

  it('encodes organization and delivery ids', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'whdl 1' }, error: null }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <WebhookReplayButton organizationId="org 1" deliveryId="whdl 1" />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/organizations/org%201/projects/webhook-deliveries/whdl%201/replay',
        { method: 'POST' }
      )
    })
  })

  it('shows the server error when replay fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          data: null,
          error: { code: 'projects/unavailable', message: 'boom' },
        }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <WebhookReplayButton organizationId="org_1" deliveryId="whdl_1" />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }))

    await waitFor(() => {
      expect(screen.getByText('boom')).toBeInTheDocument()
    })
  })

  it('shows a fallback error when the request throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('offline'))
    )

    render(
      <WebhookReplayButton organizationId="org_1" deliveryId="whdl_1" />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }))

    await waitFor(() => {
      expect(screen.getByText('Replay failed.')).toBeInTheDocument()
    })
  })
})
