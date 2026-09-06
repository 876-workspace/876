import { describe, expect, it, beforeEach, vi } from 'vitest'

/**
 * A retired origin is a live-looking one: the Cloudflare Worker still returns
 * 200, so nothing downstream reports a configuration problem — every signed-in
 * user is simply told their token is invalid.
 */
describe('identity origin validation', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  async function load(env: Record<string, string | undefined>) {
    const { resetSettingsForTest } = await import('..')
    return resetSettingsForTest({
      BILLING_DATABASE_URL: 'postgres://localhost/billing',
      ...env,
    } as NodeJS.ProcessEnv)
  }

  it('accepts the current identity service origin', async () => {
    const settings = await load({ API_URL: 'https://876-api.vercel.app' })
    expect(settings.identityApiUrl).toBe('https://876-api.vercel.app')
  })

  it('accepts a local development origin', async () => {
    const settings = await load({ API_URL: 'http://127.0.0.1:4000' })
    expect(settings.identityApiUrl).toBe('http://127.0.0.1:4000')
  })

  it('strips a trailing slash before validating', async () => {
    const settings = await load({ API_URL: 'https://876-api.vercel.app///' })
    expect(settings.identityApiUrl).toBe('https://876-api.vercel.app')
  })

  it('refuses the retired 876-api Cloudflare Worker', async () => {
    await expect(
      load({ API_URL: 'https://876-api.1876.workers.dev' })
    ).rejects.toThrow(/retired Cloudflare origin 876-api\.1876\.workers\.dev/)
  })

  it('refuses any workers.dev origin, not just 876-api', async () => {
    await expect(
      load({ API_URL: 'https://876-api-876-9e82.workers.dev' })
    ).rejects.toThrow(/retired Cloudflare origin/)
  })

  it('refuses a retired origin carrying a path and trailing slash', async () => {
    await expect(
      load({ API_URL: 'https://876-api.1876.workers.dev/' })
    ).rejects.toThrow(/retired Cloudflare origin/)
  })

  it('names API_URL in the failure so the fix is obvious', async () => {
    await expect(
      load({ API_URL: 'https://876-api.1876.workers.dev' })
    ).rejects.toThrow(/API_URL/)
  })

  it('does not reject a host that merely contains workers.dev', async () => {
    const settings = await load({ API_URL: 'https://workers.dev.876.com' })
    expect(settings.identityApiUrl).toBe('https://workers.dev.876.com')
  })

  it('refuses an API_URL that is not a URL at all', async () => {
    await expect(load({ API_URL: '876-api.vercel.app' })).rejects.toThrow(
      /API_URL is not a valid URL/
    )
  })

  it('falls back to the local default when API_URL is unset', async () => {
    const settings = await load({ API_URL: undefined })
    expect(settings.identityApiUrl).toBe('http://127.0.0.1:4000')
  })
})
