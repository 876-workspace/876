import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CurrencySettingsPanel,
  type CurrencySettingsItem,
} from './currency-settings-panel'

function createCurrency(
  overrides: Partial<CurrencySettingsItem> = {}
): CurrencySettingsItem {
  return {
    code: 'JMD',
    name: 'Jamaican Dollar',
    symbol: 'J$',
    decimalPlaces: 2,
    isDefault: true,
    isEnabled: true,
    ...overrides,
  }
}

function renderPanel(
  props: Partial<Parameters<typeof CurrencySettingsPanel>[0]> = {}
) {
  const onEnable = vi.fn().mockResolvedValue({ error: null })
  const onUpdate = vi.fn().mockResolvedValue({ error: null })
  const onDisable = vi.fn().mockResolvedValue({ error: null })
  const onSetDefault = vi.fn().mockResolvedValue({ error: null })
  const onSuccess = vi.fn()

  render(
    <CurrencySettingsPanel
      currencies={[createCurrency()]}
      canManage
      onEnable={onEnable}
      onUpdate={onUpdate}
      onDisable={onDisable}
      onSetDefault={onSetDefault}
      onSuccess={onSuccess}
      {...props}
    />
  )

  return { onEnable, onUpdate, onDisable, onSetDefault, onSuccess }
}

describe('CurrencySettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders each currency by name', () => {
    renderPanel()

    expect(screen.getByText(/Jamaican Dollar/)).toBeInTheDocument()
  })

  it('renders an empty-state icon when none are enabled', () => {
    renderPanel({ currencies: [] })

    expect(screen.getByLabelText('Currencies')).toBeInTheDocument()
  })

  it('marks the base currency so it is distinguishable', () => {
    renderPanel()

    expect(screen.getByText('Base currency')).toBeInTheDocument()
  })

  it('marks a disabled currency rather than hiding it', () => {
    renderPanel({
      currencies: [createCurrency({ isDefault: false, isEnabled: false })],
    })

    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  it('hides every mutation control from a viewer who cannot manage', () => {
    renderPanel({
      canManage: false,
      currencies: [createCurrency({ isDefault: false })],
    })

    expect(
      screen.queryByRole('button', { name: 'Add' })
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Currency code')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Make default' })
    ).not.toBeInTheDocument()
  })

  it('enables a currency with the exact code', async () => {
    const user = userEvent.setup()
    const { onEnable, onSuccess } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.type(screen.getByLabelText('Currency code'), 'usd')
    await user.click(screen.getByRole('button', { name: 'Enable currency' }))

    expect(onEnable).toHaveBeenCalledTimes(1)
    expect(onEnable).toHaveBeenCalledWith('USD')
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('promotes a currency to the base currency with the exact code', async () => {
    const user = userEvent.setup()
    const { onSetDefault } = renderPanel({
      currencies: [createCurrency({ code: 'USD', isDefault: false })],
    })

    await user.click(screen.getByRole('button', { name: 'Make default' }))

    expect(onSetDefault).toHaveBeenCalledTimes(1)
    expect(onSetDefault).toHaveBeenCalledWith('USD')
  })

  it('disables an enabled currency', async () => {
    const user = userEvent.setup()
    const { onDisable } = renderPanel({
      currencies: [createCurrency({ code: 'USD', isDefault: false })],
    })

    await user.click(screen.getByRole('button', { name: 'Disable' }))

    expect(onDisable).toHaveBeenCalledWith('USD')
  })

  it('updates a currency display definition with the exact typed payload', async () => {
    const user = userEvent.setup()
    const { onUpdate, onSuccess } = renderPanel({
      currencies: [createCurrency({ code: 'USD', isDefault: false })],
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('USD currency name'))
    await user.type(screen.getByLabelText('USD currency name'), 'US Dollar')
    await user.clear(screen.getByLabelText('USD currency symbol'))
    await user.type(screen.getByLabelText('USD currency symbol'), 'US$')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenCalledWith('USD', {
      name: 'US Dollar',
      symbol: 'US$',
      decimalPlaces: 2,
    })
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('surfaces a failure inline and does not report success', async () => {
    const user = userEvent.setup()
    const onEnable = vi
      .fn()
      .mockResolvedValue({ error: { message: 'Currency not supported.' } })
    const { onSuccess } = renderPanel({ onEnable })

    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.type(screen.getByLabelText('Currency code'), 'ZZZ')
    await user.click(screen.getByRole('button', { name: 'Enable currency' }))

    expect(
      await screen.findByText('Currency not supported.')
    ).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('rejects a code that is not three letters without calling onEnable', async () => {
    const user = userEvent.setup()
    const { onEnable } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.type(screen.getByLabelText('Currency code'), 'US')
    await user.click(screen.getByRole('button', { name: 'Enable currency' }))

    expect(onEnable).not.toHaveBeenCalled()
    expect(
      await screen.findByText('Enter a three-letter currency code.')
    ).toBeInTheDocument()
  })

  it('contains no hard-coded host route', () => {
    expect(
      readFileSync('src/panels/currency-settings-panel.tsx', 'utf8')
    ).not.toMatch(/href=/)
  })
})
