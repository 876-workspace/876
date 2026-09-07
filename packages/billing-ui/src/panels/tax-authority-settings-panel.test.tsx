import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TaxAuthority } from '@876/billing'

import { TaxAuthoritySettingsPanel } from './tax-authority-settings-panel'

const NOW = 1_757_000_000

function createAuthority(overrides: Partial<TaxAuthority> = {}): TaxAuthority {
  return {
    object: 'tax_authority',
    id: 'txa_jm',
    name: 'Tax Administration Jamaica',
    description: null,
    countryCode: 'JM',
    subdivisionCode: null,
    isDefault: false,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

function renderPanel(
  props: Partial<Parameters<typeof TaxAuthoritySettingsPanel>[0]> = {}
) {
  const onCreate = vi.fn().mockResolvedValue({ error: null })
  const onUpdate = vi.fn().mockResolvedValue({ error: null })
  const onSuccess = vi.fn()

  render(
    <TaxAuthoritySettingsPanel
      authorities={[createAuthority()]}
      countryCode="JM"
      canManage
      onCreate={onCreate}
      onUpdate={onUpdate}
      onSuccess={onSuccess}
      {...props}
    />
  )

  return { onCreate, onUpdate, onSuccess }
}

describe('TaxAuthoritySettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders each authority by name', () => {
    renderPanel()

    expect(screen.getByText('Tax Administration Jamaica')).toBeInTheDocument()
  })

  it('renders an empty state rather than a bare list when there are none', () => {
    renderPanel({ authorities: [] })

    expect(screen.getByText('No tax authorities')).toBeInTheDocument()
  })

  it('marks the default authority so it is distinguishable', () => {
    renderPanel({ authorities: [createAuthority({ isDefault: true })] })

    expect(screen.getByText('Default')).toBeInTheDocument()
  })

  it('marks an archived authority rather than hiding it', () => {
    renderPanel({ authorities: [createAuthority({ isActive: false })] })

    expect(screen.getByText('Archived')).toBeInTheDocument()
  })

  it('hides every mutation control from a viewer who cannot manage', () => {
    renderPanel({ canManage: false })

    expect(
      screen.queryByRole('button', { name: 'Add' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Make default' })
    ).not.toBeInTheDocument()
  })

  it('promotes an authority to default with the exact update params', async () => {
    const user = userEvent.setup()
    const { onUpdate, onSuccess } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Make default' }))

    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenCalledWith('txa_jm', { isDefault: true })
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('archives an active authority rather than deleting it', async () => {
    const user = userEvent.setup()
    const { onUpdate } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Archive' }))

    expect(onUpdate).toHaveBeenCalledWith('txa_jm', { isActive: false })
  })

  it('restores an archived authority', async () => {
    const user = userEvent.setup()
    const { onUpdate } = renderPanel({
      authorities: [createAuthority({ isActive: false })],
    })

    await user.click(screen.getByRole('button', { name: 'Restore' }))

    expect(onUpdate).toHaveBeenCalledWith('txa_jm', { isActive: true })
  })

  it('offers no delete affordance, because authorities are archived and never deleted', () => {
    renderPanel()

    expect(
      screen.queryByRole('button', { name: /delete|remove/i })
    ).not.toBeInTheDocument()
  })

  it('surfaces an update failure inline and does not report success', async () => {
    const user = userEvent.setup()
    const onUpdate = vi
      .fn()
      .mockResolvedValue({ error: { message: 'Authority is in use.' } })
    const { onSuccess } = renderPanel({ onUpdate })

    await user.click(screen.getByRole('button', { name: 'Make default' }))

    expect(await screen.findByText('Authority is in use.')).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('contains no hard-coded host route', () => {
    expect(
      readFileSync('src/panels/tax-authority-settings-panel.tsx', 'utf8')
    ).not.toMatch(/href=/)
  })
})
