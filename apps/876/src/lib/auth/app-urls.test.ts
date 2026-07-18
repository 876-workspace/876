import { afterEach, describe, expect, it, vi } from 'vitest'

import { appOrigin, appUrl, consoleOrigin, consoleUrl } from './app-urls'

describe('app URL origins', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses localhost defaults outside Codespaces', () => {
    vi.stubEnv('CODESPACE_NAME', '')
    vi.stubEnv('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN', '')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    vi.stubEnv('NEXT_PUBLIC_CONSOLE_URL', '')

    expect(appOrigin()).toBe('http://localhost:3000')
    expect(consoleOrigin()).toBe('http://localhost:3002')
  })

  it('derives forwarded Codespaces origins when dev env points at localhost', () => {
    vi.stubEnv('CODESPACE_NAME', 'potential-space-invention-967qjvj9vppqf75v9')
    vi.stubEnv('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN', 'app.github.dev')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
    vi.stubEnv('NEXT_PUBLIC_CONSOLE_URL', 'http://localhost:3002')

    expect(appUrl('/app')).toBe(
      'https://potential-space-invention-967qjvj9vppqf75v9-3000.app.github.dev/app'
    )
    expect(consoleUrl('/a/dashboard')).toBe(
      'https://potential-space-invention-967qjvj9vppqf75v9-3002.app.github.dev/a/dashboard'
    )
  })

  it('preserves deployed non-local env origins', () => {
    vi.stubEnv('CODESPACE_NAME', 'potential-space-invention-967qjvj9vppqf75v9')
    vi.stubEnv('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN', 'app.github.dev')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://876-app.vercel.app/')
    vi.stubEnv('NEXT_PUBLIC_CONSOLE_URL', 'https://876-misc.vercel.app/')

    expect(appOrigin()).toBe('https://876-app.vercel.app')
    expect(consoleOrigin()).toBe('https://876-misc.vercel.app')
  })
})
