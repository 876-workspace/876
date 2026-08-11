import { afterEach, describe, expect, it, vi } from 'vitest'

import { appOrigin, appUrl, consoleOrigin, consoleUrl } from './app-urls'

describe('app URL origins', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses localhost defaults outside a remote workspace', () => {
    vi.stubEnv('DEV_PREVIEW_HOST_TEMPLATE', '')
    vi.stubEnv('CODESPACE_NAME', '')
    vi.stubEnv('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN', '')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    vi.stubEnv('NEXT_PUBLIC_CONSOLE_URL', '')

    expect(appOrigin()).toBe('http://localhost:3000')
    expect(consoleOrigin()).toBe('http://localhost:3002')
  })

  it('derives forwarded origins from the host template', () => {
    vi.stubEnv('DEV_PREVIEW_HOST_TEMPLATE', 'preview-{port}.example.test')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
    vi.stubEnv('NEXT_PUBLIC_CONSOLE_URL', 'http://localhost:3002')

    expect(appUrl('/app')).toBe('https://preview-3000.example.test/app')
    expect(consoleUrl('/a/dashboard')).toBe(
      'https://preview-3002.example.test/a/dashboard'
    )
  })

  it('preserves deployed non-local env origins', () => {
    vi.stubEnv('DEV_PREVIEW_HOST_TEMPLATE', 'preview-{port}.example.test')
    vi.stubEnv('CODESPACE_NAME', 'potential-space-invention-967qjvj9vppqf75v9')
    vi.stubEnv('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN', 'app.github.dev')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://876-app.1876.workers.dev/')
    vi.stubEnv(
      'NEXT_PUBLIC_CONSOLE_URL',
      'https://876-console.1876.workers.dev/'
    )

    expect(appOrigin()).toBe('https://876-app.1876.workers.dev')
    expect(consoleOrigin()).toBe('https://876-console.1876.workers.dev')
  })
})
