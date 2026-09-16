/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ClientVisibleToggle } from '../components/client-visible-toggle'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
})

describe('ClientVisibleToggle', () => {
  afterEach(cleanup)

  it('offers to share an internal record', () => {
    render(
      <ClientVisibleToggle endpoint="/api/x/visibility" initialVisible={false} label="Phase" />
    )

    expect(
      screen.getByRole('button', { name: /share with client/i })
    ).toBeInTheDocument()
    expect(screen.queryByText('Client visible')).not.toBeInTheDocument()
  })

  it('shows the badge and hide action for a visible record', () => {
    render(
      <ClientVisibleToggle endpoint="/api/x/visibility" initialVisible={true} label="Phase" />
    )

    expect(screen.getByText('Client visible')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /hide from client/i })
    ).toBeInTheDocument()
  })

  it('patches the endpoint and mirrors the confirmed state', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { object: 'x', id: 'ms_1', clientVisible: true },
          error: null,
        }),
    })
    render(
      <ClientVisibleToggle endpoint="/api/x/visibility" initialVisible={false} label="Phase" />
    )

    await user.click(screen.getByRole('button', { name: /share with client/i }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/x/visibility',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ clientVisible: true }),
      })
    )
    expect(await screen.findByText('Client visible')).toBeInTheDocument()
  })

  it('reports a failure without flipping the state', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({ data: null, error: { message: 'Forbidden.' } }),
    })
    render(
      <ClientVisibleToggle endpoint="/api/x/visibility" initialVisible={false} label="Phase" />
    )

    await user.click(screen.getByRole('button', { name: /share with client/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden.')
    expect(screen.queryByText('Client visible')).not.toBeInTheDocument()
  })
})
