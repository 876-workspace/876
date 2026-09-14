// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RequestComposer } from './request-composer'

afterEach(cleanup)

describe('RequestComposer customer selection', () => {
  it('renders host-supplied customer options and submits the selected id', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <RequestComposer
        state={{ status: 'ready' }}
        customerOptions={[
          { id: 'cus_1', name: 'Acme Limited', description: 'billing@acme.test' },
          { id: 'cus_2', name: 'Jane Doe' },
        ]}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText('Customer'), {
      target: { value: 'cus_2' },
    })
    fireEvent.change(screen.getByPlaceholderText('Subject'), {
      target: { value: ' Delivery question ' },
    })
    fireEvent.change(screen.getByPlaceholderText('Priority'), {
      target: { value: ' normal ' },
    })
    fireEvent.submit(
      screen.getByRole('button', { name: 'Create request' }).closest('form')!
    )

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        customerId: 'cus_2',
        subject: 'Delivery question',
        description: '',
        priority: 'normal',
        category: null,
      })
    )
  })

  it('keeps customer selection out of customer-scoped composer submissions', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <RequestComposer
        state={{ status: 'ready' }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Subject'), {
      target: { value: 'Help' },
    })
    fireEvent.change(screen.getByPlaceholderText('Priority'), {
      target: { value: 'normal' },
    })
    fireEvent.submit(
      screen.getByRole('button', { name: 'Create request' }).closest('form')!
    )

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        subject: 'Help',
        description: '',
        priority: 'normal',
        category: null,
      })
    )
  })
})
