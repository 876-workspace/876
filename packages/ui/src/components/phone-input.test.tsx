import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PhoneInput, type PhoneDialCodeOption } from './phone-input'

const DIAL_CODES: PhoneDialCodeOption[] = [
  { value: 'JM', label: '🇯🇲 +1', dialCode: '+1' },
  { value: 'BB', label: '🇧🇧 +1', dialCode: '+1' },
  { value: 'GB', label: '🇬🇧 +44', dialCode: '+44' },
  { value: 'CU', label: '🇨🇺 +53', dialCode: '+53' },
]

async function openDialCodes() {
  const trigger = screen.getByRole('combobox')
  fireEvent.click(trigger)
  await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'))
}

describe('PhoneInput', () => {
  it('shows the selected country by its countryCode', () => {
    render(
      <PhoneInput
        value={{ countryCode: 'JM', dialCode: '+1', number: '' }}
        onValueChange={vi.fn()}
        dialCodes={DIAL_CODES}
      />
    )
    expect(screen.getByRole('combobox')).toHaveTextContent('🇯🇲 +1')
  })

  it('falls back to matching dialCode when countryCode is unknown', () => {
    render(
      <PhoneInput
        value={{ countryCode: 'XX', dialCode: '+44', number: '' }}
        onValueChange={vi.fn()}
        dialCodes={DIAL_CODES}
      />
    )
    expect(screen.getByRole('combobox')).toHaveTextContent('🇬🇧 +44')
  })

  it('updates both countryCode and dialCode when a new country is picked', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <PhoneInput
        value={{ countryCode: 'JM', dialCode: '+1', number: '8765550142' }}
        onValueChange={onValueChange}
        dialCodes={DIAL_CODES}
      />
    )
    await openDialCodes()
    await user.click(await screen.findByRole('option', { name: '🇬🇧 +44' }))
    expect(onValueChange).toHaveBeenCalledWith({
      countryCode: 'GB',
      dialCode: '+44',
      number: '8765550142',
    })
  })

  it('preserves the national number when the dial code changes', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <PhoneInput
        value={{ countryCode: 'GB', dialCode: '+44', number: '7700900123' }}
        onValueChange={onValueChange}
        dialCodes={DIAL_CODES}
      />
    )
    await openDialCodes()
    await user.click(await screen.findByRole('option', { name: '🇯🇲 +1' }))
    expect(onValueChange).toHaveBeenCalledWith(
      expect.objectContaining({
        number: '7700900123',
        dialCode: '+1',
        countryCode: 'JM',
      })
    )
  })

  it('updates the national number while preserving country and dial code', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const { rerender } = render(
      <PhoneInput
        value={{ countryCode: 'JM', dialCode: '+1', number: '' }}
        onValueChange={onValueChange}
        dialCodes={DIAL_CODES}
      />
    )
    const input = screen.getByRole('textbox')
    await user.type(input, '8765550142')
    // onValueChange is called per keystroke; the last call carries the full value.
    const lastCall = onValueChange.mock.calls.at(-1)?.[0]
    expect(lastCall).toMatchObject({ countryCode: 'JM', dialCode: '+1' })
    expect(lastCall.number).toBeTruthy()

    // Rerender with the updated value to ensure the input reflects it.
    rerender(
      <PhoneInput
        value={{ countryCode: 'JM', dialCode: '+1', number: '8765550142' }}
        onValueChange={vi.fn()}
        dialCodes={DIAL_CODES}
      />
    )
    expect(screen.getByRole('textbox')).toHaveValue('8765550142')
  })

  it('disables both the select and the input when disabled', () => {
    render(
      <PhoneInput
        value={{ countryCode: 'JM', dialCode: '+1', number: '' }}
        onValueChange={vi.fn()}
        dialCodes={DIAL_CODES}
        disabled
      />
    )
    const trigger1 = screen.getByRole('combobox')
    expect(
      trigger1.hasAttribute('disabled') ||
        trigger1.getAttribute('aria-disabled') === 'true' ||
        trigger1.hasAttribute('data-disabled')
    ).toBe(true)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('distinguishes countries that share the same dial code via countryCode', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <PhoneInput
        value={{ countryCode: 'JM', dialCode: '+1', number: '' }}
        onValueChange={onValueChange}
        dialCodes={DIAL_CODES}
      />
    )
    await openDialCodes()
    // Both JM and BB share +1, but picking BB must switch countryCode to BB.
    await user.click(await screen.findByRole('option', { name: '🇧🇧 +1' }))
    expect(onValueChange).toHaveBeenCalledWith(
      expect.objectContaining({ countryCode: 'BB', dialCode: '+1' })
    )
  })
})
