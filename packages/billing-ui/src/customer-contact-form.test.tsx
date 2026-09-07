import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CustomerContactForm } from './customer-contact-form'

type FormOverrides = Partial<
  React.ComponentProps<typeof CustomerContactForm>
>

// Returns the mock the component actually received, so a test that supplies
// its own `onSubmit` asserts against that one rather than an unused default.
const renderForm = (overrides: FormOverrides = {}) => {
  const onSubmit =
    overrides.onSubmit ?? vi.fn().mockResolvedValue({ error: null })
  render(
    <CustomerContactForm
      submitLabel="Save contact"
      cancelHref="/customers/cus_1"
      {...overrides}
      onSubmit={onSubmit}
    />
  )
  return onSubmit
}
describe('CustomerContactForm', () => {
  it('renders supplied initial values', () => {
    renderForm({
      initial: {
        salutation: 'Ms.',
        firstName: 'Ava',
        lastName: 'Stone',
        email: 'ava@example.com',
        isPrimary: true,
      },
    })
    expect(screen.getByLabelText('First name')).toHaveValue('Ava')
    expect(
      screen.getByRole('checkbox', { name: 'Primary contact' })
    ).toHaveAttribute('data-checked')
  })
  it('edits each text field', async () => {
    const user = userEvent.setup()
    renderForm()
    for (const [label, value] of [
      ['Salutation', 'Dr.'],
      ['First name', 'Ava'],
      ['Last name', 'Stone'],
      ['Email', 'ava@example.com'],
    ] as const) {
      await user.type(screen.getByLabelText(label), value)
      expect(screen.getByLabelText(label)).toHaveValue(value)
    }
  })
  it('submits the exact contact shape', async () => {
    const user = userEvent.setup()
    const onSubmit = renderForm()
    await user.type(screen.getByLabelText('Salutation'), 'Dr.')
    await user.type(screen.getByLabelText('First name'), 'Ava')
    await user.type(screen.getByLabelText('Last name'), 'Stone')
    await user.type(screen.getByLabelText('Email'), 'ava@example.com')
    await user.click(screen.getByRole('checkbox', { name: 'Primary contact' }))
    await user.click(screen.getByRole('button', { name: 'Save contact' }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        salutation: 'Dr.',
        firstName: 'Ava',
        lastName: 'Stone',
        email: 'ava@example.com',
        workPhone: null,
        mobilePhone: null,
        isPrimary: true,
      })
    )
  })
  it('keeps values mounted and shows a failed submit error', async () => {
    const user = userEvent.setup()
    const onSubmit = renderForm({
      onSubmit: vi
        .fn()
        .mockResolvedValue({
          error: { code: 'billing/invalid', message: 'Could not save.' },
        }),
    })
    await user.type(screen.getByLabelText('First name'), 'Ava')
    await user.click(screen.getByRole('button', { name: 'Save contact' }))
    expect(await screen.findByText('Could not save.')).toBeVisible()
    expect(screen.getByText('billing/invalid')).toBeVisible()
    expect(screen.getByLabelText('First name')).toHaveValue('Ava')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
  it('disables submit while pending', async () => {
    let resolve!: (value: { error: null }) => void
    const onSubmit = vi.fn(
      () =>
        new Promise<{ error: null }>((done) => {
          resolve = done
        })
    )
    const user = userEvent.setup()
    renderForm({ onSubmit })
    await user.click(screen.getByRole('button', { name: 'Save contact' }))
    expect(screen.getByRole('button', { name: /Save contact/ })).toBeDisabled()
    resolve({ error: null })
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Save contact' })
      ).not.toBeDisabled()
    )
  })
  it('round-trips the primary checkbox', async () => {
    const user = userEvent.setup()
    const onSubmit = renderForm({ initial: { isPrimary: true } })
    await user.click(screen.getByRole('checkbox', { name: 'Primary contact' }))
    await user.click(screen.getByRole('button', { name: 'Save contact' }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ isPrimary: false })
      )
    )
  })
  it('points cancel at cancelHref', () => {
    renderForm()
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/customers/cus_1'
    )
  })
  it('sends blank optional fields as null', async () => {
    const user = userEvent.setup()
    const onSubmit = renderForm()
    await user.click(screen.getByRole('button', { name: 'Save contact' }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        salutation: null,
        firstName: null,
        lastName: null,
        email: null,
        workPhone: null,
        mobilePhone: null,
        isPrimary: false,
      })
    )
  })
})
