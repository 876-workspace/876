import { describe, expect, it } from 'vitest'

import ModuleSettingsPage from './page'

describe('invoice module settings route', () => {
  it('calls notFound for an unknown module key', async () => {
    await expect(
      ModuleSettingsPage({
        params: Promise.resolve({ moduleKey: 'not-a-module' }),
      })
    ).rejects.toThrow('notFound')
  })

  it('calls notFound for an underscore-form module key', async () => {
    await expect(
      ModuleSettingsPage({
        params: Promise.resolve({ moduleKey: 'sales_receipts' }),
      })
    ).rejects.toThrow('notFound')
  })

  it('calls notFound for an empty module key', async () => {
    await expect(
      ModuleSettingsPage({ params: Promise.resolve({ moduleKey: '' }) })
    ).rejects.toThrow('notFound')
  })

  it('calls notFound for a Billing-only module key', async () => {
    await expect(
      ModuleSettingsPage({
        params: Promise.resolve({ moduleKey: 'subscriptions' }),
      })
    ).rejects.toThrow('notFound')
  })
})
