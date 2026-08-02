/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

import { PlanModulePicker } from './plan-module-picker'

it('selects durable modules independently of their rollout flag', async () => {
  const onChange = vi.fn()
  render(
    <PlanModulePicker
      modules={[
        {
          id: 'mod_sales',
          key: 'sales',
          name: 'Sales',
          description: 'Sales documents',
          featureSlug: 'billing_sales',
          status: 'active',
        },
      ]}
      selectedModuleIds={[]}
      onSelectedModuleIdsChange={onChange}
    />
  )

  await userEvent.click(screen.getByRole('checkbox', { name: /Sales/ }))

  expect(onChange).toHaveBeenCalledWith(['mod_sales'])
  expect(screen.getByText('Operational gate: billing_sales')).toBeVisible()
})
