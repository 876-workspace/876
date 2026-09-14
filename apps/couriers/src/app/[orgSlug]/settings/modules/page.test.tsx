/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { COURIERS_MODULE_CATALOG } from '@/lib/modules'

import ModulesSettingsPage from './page'

describe('Couriers modules settings page', () => {
  it('links every catalog module to its preferences page', async () => {
    render(
      await ModulesSettingsPage({
        params: Promise.resolve({ orgSlug: 'island-logistics' }),
      })
    )

    for (const catalogModule of COURIERS_MODULE_CATALOG) {
      expect(
        screen.getByRole('link', { name: `${catalogModule.label} settings` })
      ).toHaveAttribute(
        'href',
        `/island-logistics/settings/modules/${catalogModule.key}`
      )
    }
  })

  it('marks the state of each module without a description paragraph', async () => {
    render(
      await ModulesSettingsPage({
        params: Promise.resolve({ orgSlug: 'island-logistics' }),
      })
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Modules' })
    ).toBeVisible()
    for (const catalogModule of COURIERS_MODULE_CATALOG) {
      // Base UI renders the switch as a span, so assert the disabled
      // contract it actually exposes rather than the native attribute.
      expect(
        screen.getByLabelText(`${catalogModule.label} enabled`)
      ).toHaveAttribute('aria-disabled', 'true')
    }
  })
})
