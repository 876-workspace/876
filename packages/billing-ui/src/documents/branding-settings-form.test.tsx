import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { BRAND_ACCENT_PRESETS, DEFAULT_BRANDING } from '@876/core/branding'

import {
  BrandingSettingsForm,
  type BrandingSettingsFormProps,
} from './branding-settings-form'

function props(
  overrides: Partial<BrandingSettingsFormProps> = {}
): BrandingSettingsFormProps {
  return {
    initial: DEFAULT_BRANDING,
    logoUrl: null,
    logoHref: null,
    onSubmit: vi.fn(async () => ({ error: null })),
    ...overrides,
  }
}

describe('BrandingSettingsForm', () => {
  it('offers preset swatches with no green among them', () => {
    // ARRANGE
    render(<BrandingSettingsForm {...props()} />)

    // ASSERT — every preset renders a named swatch, and green is reserved
    // for status, never a brand accent.
    expect(BRAND_ACCENT_PRESETS.length).toBeGreaterThan(0)
    for (const preset of BRAND_ACCENT_PRESETS) {
      expect(preset.label).not.toMatch(/green/i)
      expect(
        screen.getByRole('radio', { name: preset.label })
      ).toBeInTheDocument()
    }
  })

  it('rejects an invalid custom hex and blocks submit', async () => {
    // ARRANGE
    const onSubmit = vi.fn(async () => ({ error: null }))
    render(<BrandingSettingsForm {...props({ onSubmit })} />)

    // ACT
    fireEvent.change(screen.getByLabelText('Custom accent color'), {
      target: { value: 'nope' },
    })

    // ASSERT
    expect(
      screen.getByText('Use a six-digit hex color such as #1f6feb.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the exact branding payload', async () => {
    // ARRANGE
    const onSubmit = vi.fn(async () => ({ error: null }))
    const user = userEvent.setup()
    render(<BrandingSettingsForm {...props({ onSubmit })} />)

    // ACT
    await user.click(screen.getByRole('radio', { name: 'Teal' }))
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Appearance' })).getByRole(
        'radio',
        { name: 'Dark' }
      )
    )
    await user.click(
      within(
        screen.getByRole('radiogroup', { name: 'Sidebar tone' })
      ).getByRole('radio', { name: 'Dark' })
    )
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    // ASSERT
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      accentColor: '#0d9488',
      appearance: 'dark',
      sidebarTone: 'dark',
    })
  })

  it('changes appearance and sidebar tone through their radio groups', async () => {
    // ARRANGE
    const user = userEvent.setup()
    render(<BrandingSettingsForm {...props()} />)

    // ASSERT
    for (const name of ['System', 'Light', 'Dark']) {
      expect(
        within(
          screen.getByRole('radiogroup', { name: 'Appearance' })
        ).getByRole('radio', { name: name })
      ).toBeInTheDocument()
    }
    const sidebar = screen.getByRole('radiogroup', { name: 'Sidebar tone' })
    expect(sidebar).toBeInTheDocument()

    // ACT
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Appearance' })).getByRole(
        'radio',
        { name: 'Dark' }
      )
    )

    // ASSERT
    expect(
      within(screen.getByRole('radiogroup', { name: 'Appearance' })).getByRole(
        'radio',
        { name: 'Dark' }
      )
    ).toHaveAttribute('aria-checked', 'true')
  })

  it('shows the logo and its management link when provided', () => {
    // ARRANGE
    render(
      <BrandingSettingsForm
        {...props({
          logoUrl: 'https://cdn.876.test/logo.png',
          logoHref: '/settings/logo',
        })}
      />
    )

    // ASSERT
    expect(screen.getByAltText('Organization logo')).toHaveAttribute(
      'src',
      'https://cdn.876.test/logo.png'
    )
    expect(screen.getByRole('link', { name: 'Manage logo' })).toHaveAttribute(
      'href',
      '/settings/logo'
    )
  })

  it('omits the logo link when no logo management page exists', () => {
    // ARRANGE
    render(<BrandingSettingsForm {...props()} />)

    // ASSERT
    expect(screen.getByText('No logo yet')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Manage logo' })
    ).not.toBeInTheDocument()
  })

  it('reflects the chosen accent in the live preview', async () => {
    // ARRANGE
    const user = userEvent.setup()
    render(<BrandingSettingsForm {...props()} />)

    // ACT
    await user.click(screen.getByRole('radio', { name: 'Rose' }))

    // ASSERT
    const preview = screen.getByLabelText('Brand preview') as HTMLElement
    expect(preview.style.getPropertyValue('--brand-accent')).toBe('#e11d48')
  })

  it('keeps entered values when saving fails', async () => {
    // ARRANGE
    const onSubmit = vi.fn(async () => ({
      error: { message: 'Try again later' },
    }))
    const user = userEvent.setup()
    render(<BrandingSettingsForm {...props({ onSubmit })} />)
    await user.click(screen.getByRole('radio', { name: 'Rose' }))

    // ACT
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    // ASSERT
    expect(screen.getByText('Try again later')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Rose' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })
})
