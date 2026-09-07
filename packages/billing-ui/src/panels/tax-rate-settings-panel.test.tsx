import { readFileSync } from 'node:fs'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TaxAuthority, TaxRate } from '@876/billing'

import { TaxRateSettingsPanel } from './tax-rate-settings-panel'

const NOW = 1_757_000_000

function createAuthority(overrides: Partial<TaxAuthority> = {}): TaxAuthority {
  return {
    object: 'tax_authority',
    id: 'txa_jm',
    name: 'Tax Administration Jamaica',
    description: null,
    countryCode: 'JM',
    subdivisionCode: null,
    isDefault: true,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

function createRate(overrides: Partial<TaxRate> = {}): TaxRate {
  return {
    object: 'tax_rate',
    id: 'txr_gct',
    name: 'GCT',
    description: null,
    taxType: 'vat',
    rate: '15.0000',
    inclusive: false,
    startsAt: null,
    isActive: true,
    isDefault: false,
    taxAuthority: createAuthority(),
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

function renderPanel(
  props: Partial<Parameters<typeof TaxRateSettingsPanel>[0]> = {}
) {
  const onCreate = vi.fn().mockResolvedValue({ error: null })
  const onUpdate = vi.fn().mockResolvedValue({ error: null })
  const onSuccess = vi.fn()

  render(
    <TaxRateSettingsPanel
      authorities={[createAuthority()]}
      rates={[createRate()]}
      canManage
      currentTimestamp={NOW}
      onCreate={onCreate}
      onUpdate={onUpdate}
      onSuccess={onSuccess}
      {...props}
    />
  )

  return { onCreate, onUpdate, onSuccess }
}

describe('TaxRateSettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders each rate with its name', () => {
    renderPanel()

    expect(screen.getByText(/GCT/)).toBeInTheDocument()
  })

  it('renders an empty state rather than a bare list when there are no rates', () => {
    renderPanel({ rates: [] })

    expect(screen.getByText('No tax rates')).toBeInTheDocument()
  })

  it('hides every mutation control from a viewer who cannot manage', () => {
    renderPanel({ canManage: false })

    expect(
      screen.queryByRole('button', { name: 'Add' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Make default' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Archive' })
    ).not.toBeInTheDocument()
  })

  it('disables creation when no authority is active, since a rate needs one', () => {
    renderPanel({ authorities: [createAuthority({ isActive: false })] })

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
  })

  it('promotes a rate to default with the exact update params', async () => {
    const user = userEvent.setup()
    const { onUpdate, onSuccess } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Make default' }))

    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenCalledWith('txr_gct', { isDefault: true })
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('archives an active rate rather than deleting it', async () => {
    const user = userEvent.setup()
    const { onUpdate } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Archive' }))

    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenCalledWith('txr_gct', { isActive: false })
  })

  it('restores an archived rate rather than recreating it', async () => {
    const user = userEvent.setup()
    const { onUpdate } = renderPanel({
      rates: [createRate({ isActive: false })],
    })

    await user.click(screen.getByRole('button', { name: 'Restore' }))

    expect(onUpdate).toHaveBeenCalledWith('txr_gct', { isActive: true })
  })

  it('offers no delete affordance, because rates are archived and never deleted', () => {
    renderPanel()

    expect(
      screen.queryByRole('button', { name: /delete|remove/i })
    ).not.toBeInTheDocument()
  })

  it('exposes no editable detail control on an existing rate, since details are immutable', () => {
    renderPanel()

    const list = screen.getByLabelText('Tax rates')
    expect(within(list).queryByDisplayValue('GCT')).not.toBeInTheDocument()
    expect(within(list).queryByDisplayValue('15.0000')).not.toBeInTheDocument()
  })

  it('surfaces an update failure inline and does not report success', async () => {
    const user = userEvent.setup()
    const onUpdate = vi
      .fn()
      .mockResolvedValue({ error: { message: 'Rate is in use.' } })
    const { onSuccess } = renderPanel({ onUpdate })

    await user.click(screen.getByRole('button', { name: 'Make default' }))

    expect(await screen.findByText('Rate is in use.')).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('contains no hard-coded host route', () => {
    expect(
      readFileSync('src/panels/tax-rate-settings-panel.tsx', 'utf8')
    ).not.toMatch(/href=/)
  })
})
