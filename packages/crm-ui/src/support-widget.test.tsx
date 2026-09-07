import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import type { SupportWidgetTransport } from './support-widget'
import { SupportWidget } from './support-widget'

const categoryList = {
  object: 'list' as const,
  data: [],
  has_more: false,
  total_count: 0,
  url: '/v1/service/support/categories',
}

const requestList = {
  object: 'list' as const,
  data: [],
  has_more: false,
  total_count: 0,
  url: '/v1/service/support/requests',
}

function transport(): SupportWidgetTransport {
  return {
    listCategories: vi
      .fn()
      .mockResolvedValue({ data: categoryList, error: null }),
    listRequests: vi.fn().mockResolvedValue({ data: requestList, error: null }),
    createRequest: vi.fn(),
  }
}

describe('SupportWidget', () => {
  it('loads request history and categories only when opened', async () => {
    const api = transport()
    render(<SupportWidget transport={api} />)

    expect(api.listRequests).not.toHaveBeenCalled()
    expect(api.listCategories).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Support' }))

    await waitFor(() => expect(api.listRequests).toHaveBeenCalledOnce())
    expect(api.listCategories).toHaveBeenCalledOnce()
  })

  it('uses customizable host copy without changing transport behavior', async () => {
    const api = transport()
    render(
      <SupportWidget
        transport={api}
        labels={{ trigger: 'Contact Efesto', listTitle: 'Help requests' }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Contact Efesto' }))

    expect(await screen.findByText('Help requests')).toBeInTheDocument()
  })

  it('renders the organization-wide empty state after history loads', async () => {
    render(<SupportWidget transport={transport()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Support' }))

    expect(await screen.findByText('Nothing open')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Anything your organization raises with 876 shows up here.'
      )
    ).toBeInTheDocument()
  })
})
