/** @vitest-environment jsdom */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_BRANDING } from '@876/core/branding'

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/lib/client', () => ({
  client: { branding: { update: mocks.update } },
}))

import { BrandingForm } from './branding-form'

const initial = { ...DEFAULT_BRANDING }

function renderForm() {
  return render(
    <BrandingForm initial={initial} logoUrl={null} logoHref={null} />
  )
}

describe('BrandingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.update.mockResolvedValue({ data: null, error: null })
  })

  it('saves the edited branding with the exact payload then refreshes', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Appearance' })).getByRole(
        'radio',
        { name: 'Dark' }
      )
    )
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledWith({
      ...initial,
      appearance: 'dark',
    })
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('keeps the form when saving fails', async () => {
    const user = userEvent.setup()
    mocks.update.mockResolvedValue({
      data: null,
      error: { message: 'Brand is locked.' },
    })
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Brand is locked.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Save changes' })
    ).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })
})
