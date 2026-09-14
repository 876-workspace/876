import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT: ${url}`), {
      digest: `NEXT_REDIRECT;replace;${url};307;`,
    })
  },
}))

import SettingsPage from './page'

describe('Couriers settings hub', () => {
  it('redirects to the organization profile', async () => {
    const error = await SettingsPage({
      params: Promise.resolve({ orgSlug: 'island-logistics' }),
    }).catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain(
      '/island-logistics/settings/orgprofile'
    )
  })
})
