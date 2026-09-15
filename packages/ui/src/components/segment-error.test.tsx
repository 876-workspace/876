import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SegmentError } from './segment-error'

function serverError(digest?: string) {
  return Object.assign(
    new Error('An error occurred in the Server Components render.'),
    digest === undefined ? {} : { digest }
  )
}

describe('SegmentError', () => {
  const retry = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the default copy as an alert with a retry action', () => {
    render(<SegmentError error={serverError('1437399021')} retry={retry} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Something went wrong' })
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible()
    expect(retry).not.toHaveBeenCalled()
  })

  it('shows the digest so the failure can be matched in server logs', () => {
    render(<SegmentError error={serverError('1437399021')} retry={retry} />)

    expect(screen.getByText('Reference 1437399021')).toBeVisible()
  })

  it('omits the reference line when the error carries no digest', () => {
    render(<SegmentError error={serverError()} retry={retry} />)

    expect(screen.queryByText(/^Reference/)).not.toBeInTheDocument()
  })

  it('does not render the raw error message', () => {
    render(<SegmentError error={serverError('42')} retry={retry} />)

    expect(
      screen.queryByText('An error occurred in the Server Components render.')
    ).not.toBeInTheDocument()
  })

  it('calls retry exactly once per click', () => {
    render(<SegmentError error={serverError('42')} retry={retry} />)

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(retry).toHaveBeenCalledTimes(1)
    expect(retry).toHaveBeenCalledWith()
  })

  it('renders a caller-supplied title and description', () => {
    render(
      <SegmentError
        error={serverError('42')}
        retry={retry}
        title="Packages are unavailable"
        description="The Couriers service did not respond."
      />
    )

    expect(
      screen.getByRole('heading', { name: 'Packages are unavailable' })
    ).toBeVisible()
    expect(
      screen.getByText('The Couriers service did not respond.')
    ).toBeVisible()
  })
})
